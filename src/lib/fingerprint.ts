/**
 * Purpose: Generate a browser fingerprint token for public vote deduplication.
 * Scope: Client-side fingerprinting utility for public voting flows.
 * Overview: Builds a stable signal from canvas output, screen profile, and timezone, then hashes with SHA-256.
 * Dependencies: Browser Canvas API, Intl API, Web Crypto API.
 * Exports: generateFingerprint.
 * Props/Interfaces: None.
 * State/Behavior: Falls back to random hex when runtime hashing APIs are unavailable.
 */

const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 150;
const FONT_SIZE = 14;
const RECT_X = 12;
const RECT_Y = 16;
const RECT_WIDTH = 120;
const RECT_HEIGHT = 32;
const TEXT_X = 10;
const TEXT_Y = 64;
const ARC_CENTER_X = 220;
const ARC_CENTER_Y = 72;
const ARC_RADIUS = 30;
const ARC_START_ANGLE = 0;
const ARC_END_ANGLE = Math.PI;
const HEX_RADIX = 16;
const HEX_PAIR_LENGTH = 2;
const FALLBACK_HASH_LENGTH = 64;
const SCREEN_PARTS_COUNT = 4;

function createFallbackHex(): string {
  const chars: string[] = [];

  for (let index = 0; index < FALLBACK_HASH_LENGTH; index += 1) {
    const nibble = Math.floor(Math.random() * HEX_RADIX);
    chars.push(nibble.toString(HEX_RADIX));
  }

  return chars.join('');
}

function getTimezoneSignal(): string {
  if (typeof Intl === 'undefined' || typeof Intl.DateTimeFormat !== 'function') {
    return 'unknown-timezone';
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown-timezone';
}

function getScreenSignal(): string {
  if (typeof window === 'undefined' || typeof window.screen === 'undefined') {
    return 'unknown-screen';
  }

  const parts = [
    window.screen.width,
    window.screen.height,
    window.screen.colorDepth,
    window.screen.pixelDepth,
  ];

  if (parts.length !== SCREEN_PARTS_COUNT) {
    return 'unknown-screen';
  }

  return parts.join('x');
}

function getCanvasSignal(): string {
  if (typeof document === 'undefined') {
    return 'no-canvas';
  }

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const context = canvas.getContext('2d');
  if (!context) {
    return 'no-canvas';
  }

  context.textBaseline = 'top';
  context.font = `${FONT_SIZE}px serif`;
  context.fillStyle = '#f8c5d8';
  context.fillRect(RECT_X, RECT_Y, RECT_WIDTH, RECT_HEIGHT);
  context.fillStyle = '#5a3b5d';
  context.fillText('Family Recipes Voter', TEXT_X, TEXT_Y);
  context.strokeStyle = '#f59e0b';
  context.beginPath();
  context.arc(ARC_CENTER_X, ARC_CENTER_Y, ARC_RADIUS, ARC_START_ANGLE, ARC_END_ANGLE);
  context.stroke();

  return canvas.toDataURL();
}

async function sha256Hex(input: string): Promise<string | null> {
  if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
    return null;
  }

  if (typeof TextEncoder === 'undefined') {
    return null;
  }

  const buffer = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  const bytes = new Uint8Array(digest);

  return Array.from(bytes, (byte) => byte.toString(HEX_RADIX).padStart(HEX_PAIR_LENGTH, '0')).join(
    '',
  );
}

export async function generateFingerprint(): Promise<string> {
  if (typeof window === 'undefined') {
    return createFallbackHex();
  }

  const combinedSignal = [getCanvasSignal(), getScreenSignal(), getTimezoneSignal()].join('|');

  try {
    const digest = await sha256Hex(combinedSignal);
    return digest ?? createFallbackHex();
  } catch {
    return createFallbackHex();
  }
}
