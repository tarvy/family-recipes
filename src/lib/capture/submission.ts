/**
 * What a capture accepts, and how a multipart form becomes a CaptureSubmission.
 *
 * Owns the accepted media types, the size limits, and the idempotency key.
 * The key hashes the bytes, intent, and note, so the same submit always maps
 * to the same capture.
 */

import crypto from 'node:crypto';
import type { CaptureMediaKind } from '@/db/types';
import { sha256Hex } from '@/lib/oauth/crypto';

/** Accepted upload types and how the agent treats each. The only list of capture media types. */
export const CAPTURE_MEDIA_TYPES = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/heic': 'image',
  'image/heif': 'image',
  'audio/mp4': 'audio',
  'audio/x-m4a': 'audio',
  'audio/mpeg': 'audio',
  'audio/aac': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/webm': 'audio',
} as const satisfies Record<string, CaptureMediaKind>;

export type CaptureMediaType = keyof typeof CAPTURE_MEDIA_TYPES;

/** Vercel rejects bodies over about 4.5 MB before our code runs; this leaves room for multipart framing. */
const MAX_CAPTURE_BYTES = 4_400_000;
const MAX_MEDIA_PARTS = 4;
const MAX_NOTE_CHARS = 1000;
const CAPTURE_KEY_VERSION = 'v1';
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ACCEPTED_TYPES = Object.keys(CAPTURE_MEDIA_TYPES).join(', ');
const NO_MEDIA_MESSAGE = 'Attach at least one photo or audio clip as "media".';

export interface CaptureMedia {
  readonly kind: CaptureMediaKind;
  readonly mediaType: CaptureMediaType;
  readonly bytes: Uint8Array;
  readonly sha256: string;
}

export type CaptureIntent =
  | { readonly kind: 'add' }
  /** slug pins the target; null lets the agent find it from what the cook said or showed. */
  | { readonly kind: 'change'; readonly slug: string | null };

/** Who submitted. Structurally an ApiKeyPrincipal, so routes pass the principal straight through. */
export interface CaptureSubmitter {
  readonly userId: string;
  readonly keyId: string;
}

export interface CaptureSubmission {
  readonly intent: CaptureIntent;
  readonly media: readonly [CaptureMedia, ...CaptureMedia[]];
  readonly note: string | null;
  readonly key: string;
}

export type CaptureInputErrorCode =
  | 'no_media'
  | 'too_many_media'
  | 'unsupported_media_type'
  | 'too_large'
  | 'bad_intent'
  | 'bad_slug'
  | 'note_too_long';

interface CaptureInputError {
  readonly ok: false;
  readonly code: CaptureInputErrorCode;
  readonly message: string;
}

type Checked<T> = { readonly ok: true; readonly value: T } | CaptureInputError;

export type ParsedCaptureForm =
  | { readonly ok: true; readonly submission: CaptureSubmission }
  | CaptureInputError;

interface AcceptedFile {
  readonly file: File;
  readonly mediaType: CaptureMediaType;
}

function rejected(code: CaptureInputErrorCode, message: string): CaptureInputError {
  return { ok: false, code, message };
}

function isCaptureMediaType(value: string): value is CaptureMediaType {
  return Object.hasOwn(CAPTURE_MEDIA_TYPES, value);
}

function textField(form: FormData, name: string): string | null {
  const value = form.get(name);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function acceptFile(entry: FormDataEntryValue): Checked<AcceptedFile> {
  if (typeof entry === 'string') {
    return rejected('no_media', '"media" must be a file, not text.');
  }
  if (entry.size === 0) {
    return rejected('no_media', 'A media file was empty.');
  }
  const mediaType = entry.type.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!isCaptureMediaType(mediaType)) {
    return rejected(
      'unsupported_media_type',
      `Unsupported file type "${entry.type || 'unknown'}". Send one of: ${ACCEPTED_TYPES}.`,
    );
  }
  return { ok: true, value: { file: entry, mediaType } };
}

function readMediaFiles(form: FormData): Checked<readonly AcceptedFile[]> {
  const entries = form.getAll('media');
  if (entries.length === 0) {
    return rejected('no_media', NO_MEDIA_MESSAGE);
  }
  if (entries.length > MAX_MEDIA_PARTS) {
    return rejected('too_many_media', `Attach at most ${MAX_MEDIA_PARTS} files.`);
  }

  const files: AcceptedFile[] = [];
  for (const entry of entries) {
    const accepted = acceptFile(entry);
    if (!accepted.ok) {
      return accepted;
    }
    files.push(accepted.value);
  }

  const totalBytes = files.reduce((sum, { file }) => sum + file.size, 0);
  if (totalBytes > MAX_CAPTURE_BYTES) {
    return rejected(
      'too_large',
      'Files are too large together. Resize photos or send a shorter recording.',
    );
  }
  return { ok: true, value: files };
}

function readIntent(form: FormData): Checked<CaptureIntent> {
  const intent = textField(form, 'intent')?.toLowerCase() ?? 'add';
  const slug = textField(form, 'slug');

  if (intent === 'add') {
    return slug
      ? rejected('bad_slug', 'slug only applies when intent is "change".')
      : { ok: true, value: { kind: 'add' } };
  }
  if (intent !== 'change') {
    return rejected('bad_intent', 'intent must be "add" or "change".');
  }
  if (slug && !SLUG_PATTERN.test(slug)) {
    return rejected('bad_slug', 'slug must look like "white-chicken-chili".');
  }
  return { ok: true, value: { kind: 'change', slug } };
}

function readNote(form: FormData): Checked<string | null> {
  const note = textField(form, 'note');
  if (note && note.length > MAX_NOTE_CHARS) {
    return rejected('note_too_long', `Keep the note under ${MAX_NOTE_CHARS} characters.`);
  }
  return { ok: true, value: note };
}

async function toCaptureMedia({ file, mediaType }: AcceptedFile): Promise<CaptureMedia> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return {
    kind: CAPTURE_MEDIA_TYPES[mediaType],
    mediaType,
    bytes,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
}

function captureKey(
  intent: CaptureIntent,
  note: string | null,
  media: readonly CaptureMedia[],
): string {
  const slug = intent.kind === 'change' ? intent.slug : null;
  return sha256Hex(
    JSON.stringify([CAPTURE_KEY_VERSION, intent.kind, slug, note, media.map((m) => m.sha256)]),
  );
}

/**
 * Fields: `media` (1 to 4 files), `intent` (`add` by default, or `change`),
 * `slug` (change only), and `note`.
 */
export async function parseCaptureForm(form: FormData): Promise<ParsedCaptureForm> {
  const files = readMediaFiles(form);
  if (!files.ok) {
    return files;
  }
  const intent = readIntent(form);
  if (!intent.ok) {
    return intent;
  }
  const note = readNote(form);
  if (!note.ok) {
    return note;
  }

  const [first, ...rest] = await Promise.all(files.value.map(toCaptureMedia));
  if (!first) {
    return rejected('no_media', NO_MEDIA_MESSAGE);
  }
  const media: [CaptureMedia, ...CaptureMedia[]] = [first, ...rest];

  return {
    ok: true,
    submission: {
      intent: intent.value,
      media,
      note: note.value,
      key: captureKey(intent.value, note.value, media),
    },
  };
}
