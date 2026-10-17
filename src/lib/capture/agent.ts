/**
 * The capture agent: a bounded tool loop (Vercel AI SDK with Gemini) that
 * reads the cook's photos or voice notes and proposes a Draft.
 *
 * Read-only toward recipes. The submit tools only validate and record a
 * proposal; commitDraft writes it later. The only module that imports `ai`.
 */

import { google } from '@ai-sdk/google';
import {
  generateText,
  type LanguageModel,
  type ModelMessage,
  stepCountIs,
  type ToolSet,
  tool,
} from 'ai';
import * as z from 'zod';
import { connectDB } from '@/db/connection';
import { searchRecipes } from '@/db/models/recipe.model';
import { COOKLANG_GUIDE } from '@/lib/cooklang/guide';
import { logger } from '@/lib/logger';
import { RECIPE_CATEGORIES } from '@/lib/recipes/categories';
import { getRawCooklangContent, recipeExists } from '@/lib/recipes/repository';
import { traceDbQuery, withTrace } from '@/lib/telemetry';
import { type CaptureProblem, type CaptureProblemReason, checkDraft, type Draft } from './draft';
import type { CaptureIntent, CaptureSubmission } from './submission';

const DEFAULT_CAPTURE_MODEL = 'gemini-2.5-flash';
export const MAX_AGENT_STEPS = 4;
/** Leaves the rest of the route's 60 s maxDuration to commit and record the outcome. */
export const AGENT_TIMEOUT_MS = 45_000;
const FIND_RECIPES_LIMIT = 5;
const MAX_QUERY_CHARS = 200;
const MAX_DETAIL_CHARS = 500;
const MAX_WARNINGS = 5;
const MAX_WARNING_CHARS = 200;

type AgentReasons = readonly [CaptureProblemReason, ...CaptureProblemReason[]];
const ADD_PROBLEMS = ['not_a_recipe', 'unreadable', 'duplicate'] as const satisfies AgentReasons;
const CHANGE_PROBLEMS = [
  'not_a_recipe',
  'unreadable',
  'ambiguous_target',
  'target_not_found',
] as const satisfies AgentReasons;

export type DraftOutcome =
  | { readonly ok: true; readonly draft: Draft }
  | { readonly ok: false; readonly problem: CaptureProblem };

interface RunRead {
  readonly category: string;
  readonly cooklang: string;
}

/** Per-run state the tools share. Change targets must come from `reads`. */
interface AgentRun {
  readonly reads: Map<string, RunRead>;
  readonly pinnedSlug: string | null;
  outcome: DraftOutcome | null;
}

type ToolReply =
  | { readonly accepted: true; readonly slug: string }
  | { readonly accepted: false; readonly errors: readonly string[] };

function problem(
  reason: CaptureProblemReason,
  detail: string,
  candidates: readonly string[] = [],
): CaptureProblem {
  return { reason, detail, candidates };
}

function refused(error: string): ToolReply {
  return { accepted: false, errors: [error] };
}

/** First terminal tool call wins, so a step that calls two cannot swap the outcome. */
function settle(run: AgentRun, outcome: DraftOutcome): boolean {
  if (run.outcome) {
    return false;
  }
  run.outcome = outcome;
  return true;
}

function captureModel(): LanguageModel {
  return google(process.env['CAPTURE_MODEL'] ?? DEFAULT_CAPTURE_MODEL);
}

interface RecipeMatch {
  readonly slug: string;
  readonly title: string;
  readonly category: string | undefined;
}

async function findRecipes(query: string): Promise<readonly RecipeMatch[]> {
  await connectDB();
  const recipes = await traceDbQuery('find', 'recipes', () =>
    searchRecipes(query, { limit: FIND_RECIPES_LIMIT }),
  );
  return recipes.map(({ slug, title, category }) => ({ slug, title, category }));
}

async function readForRun(
  run: AgentRun,
  slug: string,
): Promise<
  | { readonly ok: true; readonly read: RunRead }
  | { readonly ok: false; readonly problem: CaptureProblem }
> {
  const current = await getRawCooklangContent(slug);
  if (!current) {
    return { ok: false, problem: problem('target_not_found', `No recipe has slug "${slug}".`) };
  }
  if (!current.content) {
    return {
      ok: false,
      problem: problem(
        'target_has_no_cooklang',
        `"${slug}" has no stored Cooklang, so it cannot be changed safely.`,
        [slug],
      ),
    };
  }
  const read = { category: current.category, cooklang: current.content };
  run.reads.set(slug, read);
  return { ok: true, read };
}

const draftFields = {
  cooklang: z.string().min(1),
  category: z.enum(RECIPE_CATEGORIES),
  warnings: z
    .array(z.string().max(MAX_WARNING_CHARS))
    .max(MAX_WARNINGS)
    .describe('Short notes for the cook about anything you had to guess. Empty if none.'),
};

function readTools(run: AgentRun): ToolSet {
  return {
    find_recipes: tool({
      description: `Search the family cookbook by title, description, or tags. Returns up to ${FIND_RECIPES_LIMIT} matches.`,
      inputSchema: z.object({ query: z.string().min(1).max(MAX_QUERY_CHARS) }),
      execute: async ({ query }) => findRecipes(query),
    }),
    read_recipe: tool({
      description: "Read a recipe's current Cooklang by slug.",
      inputSchema: z.object({ slug: z.string().min(1) }),
      execute: async ({ slug }) => {
        const result = await readForRun(run, slug);
        return result.ok ? { slug, ...result.read } : { error: result.problem.detail };
      },
    }),
  };
}

function cannotCompleteTool(run: AgentRun, reasons: AgentReasons): ToolSet {
  return {
    cannot_complete: tool({
      description: 'Stop without a draft and tell the cook why.',
      inputSchema: z.object({
        reason: z.enum(reasons),
        detail: z.string().min(1).max(MAX_DETAIL_CHARS),
        candidates: z.array(z.string()).max(FIND_RECIPES_LIMIT).describe('Relevant recipe slugs.'),
      }),
      execute: async ({ reason, detail, candidates }) => ({
        recorded: settle(run, { ok: false, problem: problem(reason, detail, candidates) }),
      }),
    }),
  };
}

function addTools(run: AgentRun): ToolSet {
  return {
    ...readTools(run),
    ...cannotCompleteTool(run, ADD_PROBLEMS),
    submit_new_recipe: tool({
      description: 'Propose the new recipe. Returns errors to fix if it is not valid.',
      inputSchema: z.object(draftFields),
      execute: async ({ cooklang, category, warnings }): Promise<ToolReply> => {
        const checked = await checkDraft({ cooklang, category, warnings, target: { kind: 'new' } });
        if (!checked.ok) {
          return { accepted: false, errors: checked.errors };
        }
        const { slug } = checked.draft;
        if (await recipeExists(slug)) {
          return refused(
            `A recipe with slug "${slug}" already exists. If it is the same dish, call cannot_complete with reason "duplicate" and candidates ["${slug}"]. If it is a different dish, give it a distinct title.`,
          );
        }
        return settle(run, { ok: true, draft: checked.draft })
          ? { accepted: true, slug }
          : refused('This run already finished.');
      },
    }),
  };
}

function changeTools(run: AgentRun): ToolSet {
  return {
    ...readTools(run),
    ...cannotCompleteTool(run, CHANGE_PROBLEMS),
    submit_change: tool({
      description:
        'Propose the full changed Cooklang for a recipe you read with read_recipe. Returns errors to fix if it is not valid.',
      inputSchema: z.object({ slug: z.string().min(1), ...draftFields }),
      execute: async ({ slug, cooklang, category, warnings }): Promise<ToolReply> => {
        if (run.pinnedSlug && slug !== run.pinnedSlug) {
          return refused(`The cook asked to change "${run.pinnedSlug}". Submit that recipe.`);
        }
        const base = run.reads.get(slug);
        if (!base) {
          return refused(`Call read_recipe for "${slug}" before submitting a change.`);
        }
        if (cooklang === base.cooklang) {
          return refused('That is identical to the current recipe. Apply what the cook asked.');
        }
        const checked = await checkDraft({
          cooklang,
          category,
          warnings,
          target: { kind: 'change', slug, baseCooklang: base.cooklang },
        });
        if (!checked.ok) {
          return { accepted: false, errors: checked.errors };
        }
        return settle(run, { ok: true, draft: checked.draft })
          ? { accepted: true, slug: checked.draft.slug }
          : refused('This run already finished.');
      },
    }),
  };
}

const SHARED_RULES = [
  "You turn a family cook's photos or voice notes into a Cooklang recipe for the family cookbook.",
  'Transcribe faithfully. Never invent quantities, ingredients, or steps.',
  'When something is unclear, use your best reading and add a short warning for the cook.',
  'Start with ">> title:". Add ">> source:" describing the card or voice note.',
  "For voice notes, drop filler words but keep the cook's wording in the steps.",
  `Pick one category: ${RECIPE_CATEGORIES.join(', ')}.`,
  'Nothing is saved until a submit tool accepts your draft. If it returns errors, fix them and submit again.',
];

const ADD_RULES = [
  'This is a new recipe. Check find_recipes first.',
  'If the same dish is already in the cookbook, call cannot_complete with reason "duplicate" and its slug.',
  'Submit with submit_new_recipe.',
];

const PINNED_CHANGE_RULES = [
  'The cook wants to change the recipe shown below.',
  'Apply only what the cook asked. Keep every other line exactly as it is.',
  'Submit the full changed Cooklang with submit_change.',
];

const SEARCH_CHANGE_RULES = [
  'The cook wants to change an existing recipe. Find it with find_recipes and read it with read_recipe.',
  'If several recipes match, call cannot_complete with "ambiguous_target" and their slugs. If none match, use "target_not_found".',
  'Apply only what the cook asked. Keep every other line exactly as it is.',
  'Submit the full changed Cooklang with submit_change.',
];

function intentRules(intent: CaptureIntent): readonly string[] {
  switch (intent.kind) {
    case 'add':
      return ADD_RULES;
    case 'change':
      return intent.slug ? PINNED_CHANGE_RULES : SEARCH_CHANGE_RULES;
    default: {
      const unreachable: never = intent;
      return unreachable;
    }
  }
}

function buildInstructions(intent: CaptureIntent): string {
  const rules = [...SHARED_RULES, ...intentRules(intent)].map((rule) => `- ${rule}`).join('\n');
  return `${rules}\n\n${COOKLANG_GUIDE}`;
}

function buildUserMessage(submission: CaptureSubmission, run: AgentRun): ModelMessage {
  const pinned = run.pinnedSlug ? run.reads.get(run.pinnedSlug) : undefined;
  const text = [
    `The cook sent ${submission.media.length} file(s) and wants to ${submission.intent.kind} a recipe.`,
    submission.note ? `Their note: ${submission.note}` : '',
    pinned && run.pinnedSlug
      ? `Current Cooklang for "${run.pinnedSlug}" (category ${pinned.category}):\n${pinned.cooklang}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    role: 'user',
    content: [
      { type: 'text', text },
      ...submission.media.map((media) => ({
        type: 'file' as const,
        data: media.bytes,
        mediaType: media.mediaType,
      })),
    ],
  };
}

/**
 * Run the agent once. Reads recipes and never writes them. Throws only on
 * infrastructure failure (provider error, abort); the caller records that
 * as a failed attempt.
 */
export async function draftRecipe(
  submission: CaptureSubmission,
  model: LanguageModel = captureModel(),
): Promise<DraftOutcome> {
  return withTrace('capture.agent', async (span) => {
    const { intent } = submission;
    const run: AgentRun = {
      reads: new Map(),
      pinnedSlug: intent.kind === 'change' ? intent.slug : null,
      outcome: null,
    };
    const modelId = typeof model === 'string' ? model : model.modelId;
    span.setAttributes({
      intent: intent.kind,
      media_count: submission.media.length,
      model: modelId,
    });

    if (run.pinnedSlug) {
      const pinned = await readForRun(run, run.pinnedSlug);
      if (!pinned.ok) {
        return { ok: false, problem: pinned.problem };
      }
    }

    const result = await generateText({
      model,
      instructions: buildInstructions(intent),
      messages: [buildUserMessage(submission, run)],
      tools: intent.kind === 'add' ? addTools(run) : changeTools(run),
      toolChoice: 'required',
      stopWhen: [stepCountIs(MAX_AGENT_STEPS), () => run.outcome !== null],
      abortSignal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
    });

    const outcome: DraftOutcome = run.outcome ?? {
      ok: false,
      problem: problem('gave_up', `No valid draft after ${result.steps.length} steps.`),
    };
    const outcomeName = outcome.ok ? 'draft' : outcome.problem.reason;
    span.setAttributes({ steps: result.steps.length, outcome: outcomeName });
    logger.capture.info('Capture agent finished', {
      model: modelId,
      intent: intent.kind,
      steps: result.steps.length,
      tools: result.steps.flatMap((step) => step.toolCalls.map((call) => call.toolName)).join(','),
      inputTokens: result.totalUsage.inputTokens,
      outputTokens: result.totalUsage.outputTokens,
      outcome: outcomeName,
    });
    return outcome;
  });
}
