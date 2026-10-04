/**
 * Every MCP tool's real structured output must match its declared
 * outputSchema. The SDK publishes output schemas as JSON Schema with
 * `additionalProperties: false`, and MCP clients (SDK `Client.callTool`)
 * reject structured content with undeclared keys - e.g. the recipe_get
 * failure "data/recipe must NOT have additional properties".
 *
 * This test drives each tool through a real SDK Client over an in-memory
 * transport, so both the server-side zod check and the client-side JSON
 * Schema check run. Data comes from real (unsaved) Mongoose documents run
 * through the production mappers; only DB I/O and write-side services are
 * stubbed. No database connection is made.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const menuMocks = vi.hoisted(() => ({
  getOrCreateMenuForWeek: vi.fn(),
  addAssignment: vi.fn(),
  removeAssignment: vi.fn(),
  sendSurvey: vi.fn(),
  finalizeMenu: vi.fn(),
}));

const recipeWriteMocks = vi.hoisted(() => ({
  createRecipe: vi.fn(),
  updateRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
}));

vi.mock('@/db/connection', () => ({ connectDB: vi.fn(async () => undefined) }));
vi.mock('@/lib/menu/service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/menu/service')>()),
  ...menuMocks,
}));
vi.mock('@/lib/recipes/repository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/recipes/repository')>()),
  ...recipeWriteMocks,
}));

import { Recipe, ShoppingList, User, WeeklyMenu } from '@/db/models';
import { createMcpServer } from '@/mcp/server';

const USER_EMAIL = 'owner@example.com';

/** A recipe as synced from Cooklang, with every optional field populated. */
function buildRecipeDoc(slug: string) {
  return new Recipe({
    filePath: `entrees/${slug}.cook`,
    title: 'Chicken Parmesan Pasta',
    slug,
    category: 'entrees',
    description: 'Crispy chicken over pasta.',
    servings: 4,
    prepTime: 15,
    cookTime: 30,
    totalTime: 45,
    difficulty: 'easy',
    cuisine: 'Italian',
    course: 'dinner',
    ingredients: [{ name: 'chicken breast', quantity: '2', unit: 'lbs' }, { name: 'salt' }],
    cookware: [{ name: 'skillet', quantity: 1 }, { name: 'pot' }],
    steps: [
      {
        text: 'Season the chicken breast with salt.',
        ingredients: [{ name: 'chicken breast', quantity: '2', unit: 'lbs' }, { name: 'salt' }],
        cookware: [{ name: 'skillet' }],
        timers: [{ duration: 10, unit: 'minutes' }],
      },
      { text: 'Serve.' },
    ],
    tags: ['weeknight'],
    rawCooklang: '>> title: Chicken Parmesan Pasta',
    rating: 5,
    cookLog: [
      { cookedAt: new Date('2026-09-01T00:00:00Z'), note: 'Great' },
      { cookedAt: new Date() },
    ],
    updatedAt: new Date('2026-09-02T00:00:00Z'),
  });
}

/**
 * Stand-in for a Mongoose query resolving to `value`: awaitable directly (a
 * real Promise) and chainable via sort/skip/limit/exec.
 */
function fakeQuery<T>(value: T) {
  const chain = {
    sort: () => query,
    skip: () => query,
    limit: () => query,
    exec: async () => value,
  };
  const query: Promise<T> & typeof chain = Object.assign(Promise.resolve(value), chain);
  return query;
}

function buildMenuDoc(status: 'building' | 'survey-sent' | 'locked-in', recipeId: Types.ObjectId) {
  return new WeeklyMenu({
    ownerId: new Types.ObjectId(),
    weekLabel: '2026-W40',
    weekStartDate: new Date('2026-09-28T00:00:00Z'),
    status,
    assignments: [
      { recipeId, title: 'Chicken Parmesan Pasta', source: 'cookbook', day: 'mon' },
      {
        discoveryRecipeId: new Types.ObjectId(),
        title: 'Discovered Tacos',
        thumbnailUrl: 'https://example.com/t.jpg',
        source: 'discovery',
        day: 'tue',
        mealSlot: 'dinner',
      },
    ],
    votes: [{ voterName: 'Kid', voterToken: 'tok', picks: [recipeId] }],
    votingToken: 'vote-token',
  });
}

/** Arguments for each tool; every registered tool must appear here. */
const TOOL_CALLS: Record<string, Record<string, unknown>> = {
  recipe_list: {},
  recipe_get: { slug: 'chicken-parmesan-pasta' },
  recipe_search: { query: 'chicken' },
  recipe_categories: {},
  ingredient_lookup: { ingredient: 'chicken' },
  recipe_create: { content: '>> title: X\nCook @rice{1%cup}.', category: 'entrees' },
  recipe_update: { slug: 'x', content: '>> title: X', category: 'entrees' },
  recipe_delete: { slug: 'x' },
  shopping_list_create: { recipeSlugs: ['chicken-parmesan-pasta'], userEmail: USER_EMAIL },
  shopping_list_get: { id: new Types.ObjectId().toString() },
  menu_get_week: { userEmail: USER_EMAIL },
  menu_add_dinner: { recipeSlug: 'chicken-parmesan-pasta', day: 'mon', userEmail: USER_EMAIL },
  menu_remove_assignment: { menuId: 'm', assignmentId: 'a' },
  menu_send_survey: { menuId: 'm' },
  menu_finalize: { menuId: 'm', userEmail: USER_EMAIL },
};

let client: Client;

beforeAll(async () => {
  const recipe = buildRecipeDoc('chicken-parmesan-pasta');
  vi.spyOn(Recipe, 'find').mockImplementation((() => fakeQuery([recipe])) as never);
  vi.spyOn(Recipe, 'findOne').mockImplementation((() => fakeQuery(recipe)) as never);
  vi.spyOn(User, 'findOne').mockImplementation((() =>
    fakeQuery(new User({ email: USER_EMAIL, role: 'owner' }))) as never);
  vi.spyOn(ShoppingList, 'create').mockImplementation(
    (async (data: unknown) => new ShoppingList(data as Record<string, unknown>)) as never,
  );
  vi.spyOn(ShoppingList, 'findById').mockImplementation((() =>
    fakeQuery(
      new ShoppingList({
        userId: new Types.ObjectId(),
        name: 'Meal Plan',
        status: 'active',
        items: [
          {
            ingredientName: 'chicken breast',
            quantity: '2 lbs',
            category: 'meat',
            isChecked: true,
          },
          { ingredientName: 'salt', category: 'pantry', isChecked: false },
        ],
        recipes: [{ recipeId: recipe._id, servingsMultiplier: 1 }],
      }),
    )) as never);

  menuMocks.getOrCreateMenuForWeek.mockResolvedValue(buildMenuDoc('building', recipe._id));
  menuMocks.addAssignment.mockResolvedValue(buildMenuDoc('building', recipe._id));
  menuMocks.removeAssignment.mockResolvedValue(buildMenuDoc('building', recipe._id));
  menuMocks.sendSurvey.mockResolvedValue({ votingToken: 'v', votingUrl: '/vote/v' });
  menuMocks.finalizeMenu.mockResolvedValue({
    shoppingListId: new Types.ObjectId().toString(),
    alerts: [{ recipeTitle: 'Discovered Tacos', reason: 'Unparseable ingredients: a pinch' }],
  });
  recipeWriteMocks.createRecipe.mockResolvedValue({ success: true, slug: 'x' });
  recipeWriteMocks.updateRecipe.mockResolvedValue({ success: true, slug: 'x' });
  recipeWriteMocks.deleteRecipe.mockResolvedValue({ success: true });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer();
  await server.connect(serverTransport);
  client = new Client({ name: 'output-schema-test', version: '0.0.0' });
  await client.connect(clientTransport);
});

afterAll(async () => {
  await client.close();
  vi.restoreAllMocks();
});

describe('MCP tool output schemas', () => {
  it('covers every registered tool, and each declares an output schema', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual(Object.keys(TOOL_CALLS).sort());
    for (const tool of tools) {
      expect(tool.outputSchema, tool.name).toBeDefined();
    }
  });

  it.each(
    Object.entries(TOOL_CALLS),
  )('%s structured output matches its declared outputSchema', async (name, args) => {
    // listTools() primes the client's output-schema validators
    await client.listTools();
    // Client.callTool throws McpError(-32602) on a schema mismatch
    const result = await client.callTool({ name, arguments: args });
    expect(result.isError, JSON.stringify(result.content)).toBeFalsy();
    expect(result.structuredContent).toBeDefined();
  });

  it.each([
    ['recipe_get', { slug: 'missing' }, Recipe],
    ['shopping_list_get', { id: new Types.ObjectId().toString() }, ShoppingList],
  ] as const)('%s not-found output matches its declared outputSchema', async (name, args, model) => {
    const method = model === Recipe ? 'findOne' : 'findById';
    vi.spyOn(model, method).mockImplementationOnce((() => fakeQuery(null)) as never);
    await client.listTools();
    const result = await client.callTool({ name, arguments: args });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({ found: false });
  });

  it('recipe_search tolerates stored nulls in optional fields', async () => {
    const doc = buildRecipeDoc('null-fields');
    doc.set({ description: null, cuisine: null, course: null });
    vi.spyOn(Recipe, 'find').mockImplementationOnce((() => fakeQuery([doc])) as never);
    await client.listTools();
    const result = await client.callTool({ name: 'recipe_search', arguments: { query: 'x' } });
    expect(result.isError, JSON.stringify(result.content)).toBeFalsy();
  });

  it('recipe_get returns the full recipe details', async () => {
    await client.listTools();
    const result = await client.callTool({
      name: 'recipe_get',
      arguments: { slug: 'chicken-parmesan-pasta' },
    });
    const recipe = (result.structuredContent as { recipe: Record<string, unknown> }).recipe;
    expect(recipe['rating']).toBe(5);
    expect(recipe['updatedAt']).toBe('2026-09-02T00:00:00.000Z');
    expect(recipe['cookLog']).toHaveLength(2);
    const [firstStep] = recipe['steps'] as Array<Record<string, unknown>>;
    expect(firstStep?.['ingredients']).toEqual([
      { name: 'chicken breast', quantity: '2', unit: 'lbs' },
      { name: 'salt' },
    ]);
  });
});
