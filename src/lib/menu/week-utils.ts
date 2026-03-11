/** ISO 8601 week label utilities for meal planning calendars. */

const WEEK_LABEL_PATTERN = /^(\d{4})-W(\d{2})$/;
const DAYS_PER_WEEK = 7;
const THURSDAY_OFFSET = 3;
const MS_PER_DAY = 86_400_000;
const WEEK_LABEL_PAD_WIDTH = 2;
const WEEK_NUMBER_GROUP = 2;

export function getISOWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  const dayOfWeek = d.getUTCDay() || DAYS_PER_WEEK;
  d.setUTCDate(d.getUTCDate() + (THURSDAY_OFFSET + 1) - dayOfWeek);

  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / DAYS_PER_WEEK,
  );

  const weekYear = d.getUTCFullYear();
  const paddedWeek = String(weekNumber).padStart(WEEK_LABEL_PAD_WIDTH, '0');

  return `${weekYear}-W${paddedWeek}`;
}

export function getWeekStartDate(date: Date): Date {
  const dayOfWeek = date.getUTCDay() || DAYS_PER_WEEK;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - dayOfWeek + 1);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export function getCurrentWeekLabel(): string {
  return getISOWeekLabel(new Date());
}

export function getNextWeekLabel(): string {
  const next = new Date();
  next.setUTCDate(next.getUTCDate() + DAYS_PER_WEEK);
  return getISOWeekLabel(next);
}

export function parseWeekLabel(label: string): { year: number; week: number } {
  const match = WEEK_LABEL_PATTERN.exec(label);
  if (!match) {
    throw new Error(`Invalid week label format: "${label}". Expected "YYYY-Www".`);
  }

  const year = Number(match[1]);
  const week = Number(match[WEEK_NUMBER_GROUP]);

  return { year, week };
}
