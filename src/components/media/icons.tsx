/**
 * Shared SVG icons for media capture components.
 *
 * Centralises icon definitions to avoid duplicate code across
 * camera-capture, audio-recorder, cover-photo-button, and related files.
 * All stroke-based icons use the StrokeIcon wrapper to eliminate boilerplate.
 */

import type { ReactNode } from 'react';

/** SVG icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;

interface IconProps {
  className?: string;
}

/** Shared wrapper for outlined (stroke-based) 24x24 SVG icons. */
function StrokeIcon({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Shared stroke-path element with rounded caps. */
function StrokePath({ d }: { d: string }) {
  return (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ICON_STROKE_WIDTH} d={d} />
  );
}

export function CloseIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <StrokePath d="M6 18L18 6M6 6l12 12" />
    </StrokeIcon>
  );
}

export function CameraIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <StrokePath d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <StrokePath d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </StrokeIcon>
  );
}

export function MicIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <StrokePath d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z" />
    </StrokeIcon>
  );
}

export function GalleryIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <StrokePath d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </StrokeIcon>
  );
}

export function SwitchCameraIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <StrokePath d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </StrokeIcon>
  );
}

export function PinIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <StrokePath d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </StrokeIcon>
  );
}

export function CameraOffIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <StrokePath d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </StrokeIcon>
  );
}

export function MicOffIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <StrokePath d="M19 19l-7-7m0 0l-7-7m7 7h8m-8 0V5a2 2 0 00-4 0v6" />
    </StrokeIcon>
  );
}

/** Clock circle centre coordinate (within 24x24 viewBox) */
const CLOCK_CENTER = 12;

/** Clock circle radius */
const CLOCK_RADIUS = 10;

export function ClockIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <circle
        cx={CLOCK_CENTER}
        cy={CLOCK_CENTER}
        r={CLOCK_RADIUS}
        strokeWidth={ICON_STROKE_WIDTH}
      />
      <path strokeLinecap="round" strokeWidth={ICON_STROKE_WIDTH} d="M12 6v6l4 2" />
    </StrokeIcon>
  );
}

export function ServingsIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <StrokePath d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </StrokeIcon>
  );
}

/** Calendar coordinate constants (within 24x24 viewBox) */
const CALENDAR_X = 3;
const CALENDAR_Y = 4;
const CALENDAR_SIZE = 18;
const CALENDAR_PEG_LEFT = 8;
const CALENDAR_PEG_RIGHT = 16;
const CALENDAR_PEG_TOP = 2;
const CALENDAR_PEG_BOTTOM = 6;
const CALENDAR_DIVIDER_Y = 10;
const CALENDAR_RIGHT_EDGE = 21;

export function CalendarIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <rect
        x={CALENDAR_X}
        y={CALENDAR_Y}
        width={CALENDAR_SIZE}
        height={CALENDAR_SIZE}
        rx={ICON_STROKE_WIDTH}
        ry={ICON_STROKE_WIDTH}
        strokeWidth={ICON_STROKE_WIDTH}
      />
      <line
        x1={CALENDAR_PEG_RIGHT}
        y1={CALENDAR_PEG_TOP}
        x2={CALENDAR_PEG_RIGHT}
        y2={CALENDAR_PEG_BOTTOM}
        strokeWidth={ICON_STROKE_WIDTH}
      />
      <line
        x1={CALENDAR_PEG_LEFT}
        y1={CALENDAR_PEG_TOP}
        x2={CALENDAR_PEG_LEFT}
        y2={CALENDAR_PEG_BOTTOM}
        strokeWidth={ICON_STROKE_WIDTH}
      />
      <line
        x1={CALENDAR_X}
        y1={CALENDAR_DIVIDER_Y}
        x2={CALENDAR_RIGHT_EDGE}
        y2={CALENDAR_DIVIDER_Y}
        strokeWidth={ICON_STROKE_WIDTH}
      />
    </StrokeIcon>
  );
}

export function TrashIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <StrokePath d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </StrokeIcon>
  );
}

/** Vertical three-dot icon constants (within 24x24 viewBox) */
const DOT_RADIUS = 2;
const DOT_CENTER_X = 12;
const DOT_TOP_Y = 5;
const DOT_MIDDLE_Y = 12;
const DOT_BOTTOM_Y = 19;

export function MoreVerticalIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx={DOT_CENTER_X} cy={DOT_TOP_Y} r={DOT_RADIUS} />
      <circle cx={DOT_CENTER_X} cy={DOT_MIDDLE_Y} r={DOT_RADIUS} />
      <circle cx={DOT_CENTER_X} cy={DOT_BOTTOM_Y} r={DOT_RADIUS} />
    </svg>
  );
}

export function EditIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <StrokePath d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </StrokeIcon>
  );
}
