'use client';

/** Fanned stack of recipe cards for slots with multiple assignments. */

import { cn } from '@/lib/utils';
import type { SerializedAssignment } from './planner-page';

const FAN_OFFSET_X = 12;
const FAN_OFFSET_Y = -8;
const FAN_ROTATION = 2;
const FAN_CARD_WIDTH = 96;
const FAN_CARD_HEIGHT = 28;
interface CardFanProps {
  assignments: SerializedAssignment[];
  onTap: (assignments: SerializedAssignment[]) => void;
  onRemove: (assignmentId: string) => void;
  disabled: boolean;
}

function computeFanDimensions(count: number) {
  if (count <= 1) {
    return { width: FAN_CARD_WIDTH, height: FAN_CARD_HEIGHT };
  }

  const lastIndex = count - 1;
  const spreadX = lastIndex * FAN_OFFSET_X;
  const spreadY = Math.abs(lastIndex * FAN_OFFSET_Y);

  return {
    width: FAN_CARD_WIDTH + spreadX,
    height: FAN_CARD_HEIGHT + spreadY,
  };
}

export function CardFan({ assignments, onTap, onRemove, disabled }: CardFanProps) {
  const count = assignments.length;

  if (count === 0) {
    return null;
  }

  if (count === 1) {
    const solo = assignments[0];
    if (!solo) {
      return null;
    }
    return <SinglePill assignment={solo} />;
  }

  const { width, height } = computeFanDimensions(count);
  const topCardIndex = count - 1;

  return (
    <button
      type="button"
      className="group relative cursor-pointer border-none bg-transparent p-0"
      style={{ width: `${width}px`, height: `${height}px` }}
      onClick={() => onTap(assignments)}
      aria-label={`${count} recipes stacked, tap to expand`}
    >
      {assignments.map((assignment, index) => {
        const isTopCard = index === topCardIndex;

        return (
          <FanCard
            key={assignment._id}
            assignment={assignment}
            index={index}
            isTopCard={isTopCard}
            onRemove={onRemove}
            disabled={disabled}
          />
        );
      })}
    </button>
  );
}

interface FanCardProps {
  assignment: SerializedAssignment;
  index: number;
  isTopCard: boolean;
  onRemove: (assignmentId: string) => void;
  disabled: boolean;
}

function FanCard({ assignment, index, isTopCard, onRemove, disabled }: FanCardProps) {
  const translateX = index * FAN_OFFSET_X;
  const translateY = index * FAN_OFFSET_Y;
  const rotation = index * FAN_ROTATION;

  return (
    <span
      className={cn(
        'absolute left-0 bottom-0 flex items-center gap-1 rounded-md bg-pink-light/30 px-2 py-1 text-xs shadow-sm',
        'transition-transform duration-200 group-hover:scale-105',
      )}
      style={{
        width: `${FAN_CARD_WIDTH}px`,
        transform: `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg)`,
        zIndex: index,
      }}
    >
      <span className="flex-1 truncate text-foreground">{assignment.title}</span>
      {isTopCard && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(assignment._id);
          }}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={`Remove ${assignment.title}`}
        >
          {'\u00d7'}
        </button>
      )}
    </span>
  );
}

interface SinglePillProps {
  assignment: SerializedAssignment;
}

function SinglePill({ assignment }: SinglePillProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-pink-light/30 px-2 py-0.5 text-xs text-foreground">
      {assignment.title}
    </span>
  );
}
