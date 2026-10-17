/**
 * Shared capture test fixtures: Cooklang, upload forms, and drafts.
 */

import { checkDraft, type Draft, type DraftInput } from '../draft';
import { type CaptureSubmission, parseCaptureForm } from '../submission';

export const CHILI_SLUG = 'weeknight-chili';

export const CHILI = `>> title: Weeknight Chili
>> servings: 4

Brown @ground beef{1%lb} in a #pot{}.

Add @kidney beans{1%can} and simmer for ~{20%minutes}.
`;

export const CHILI_EDITED = CHILI.replace('@kidney beans{1%can}', '@kidney beans{2%cans}');

export const CHILI_SIMMERED = CHILI.replace('~{20%minutes}', '~{40%minutes}');

export const UNTITLED_CHILI = CHILI.replace(/^>> title: .*\n/m, '');

export function photo(contents = 'front of the recipe card'): File {
  return new File([contents], 'card.jpg', { type: 'image/jpeg' });
}

export function voiceNote(contents = 'use two cans of beans'): File {
  return new File([contents], 'note.m4a', { type: 'audio/x-m4a' });
}

interface FormFields {
  readonly media?: readonly File[];
  readonly intent?: string;
  readonly slug?: string;
  readonly note?: string;
}

export function captureForm(fields: FormFields = {}): FormData {
  const form = new FormData();
  for (const file of fields.media ?? [photo()]) {
    form.append('media', file);
  }
  for (const name of ['intent', 'slug', 'note'] as const) {
    const value = fields[name];
    if (value !== undefined) {
      form.append(name, value);
    }
  }
  return form;
}

export async function submissionFor(form: FormData): Promise<CaptureSubmission> {
  const parsed = await parseCaptureForm(form);
  if (!parsed.ok) {
    throw new Error(parsed.message);
  }
  return parsed.submission;
}

export async function checked(input: DraftInput): Promise<Draft> {
  const result = await checkDraft(input);
  if (!result.ok) {
    throw new Error(result.errors.join(' '));
  }
  return result.draft;
}

export function newChiliDraft(): Promise<Draft> {
  return checked({ cooklang: CHILI, category: 'soups', warnings: [], target: { kind: 'new' } });
}
