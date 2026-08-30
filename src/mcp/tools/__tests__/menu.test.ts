import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import { getToolScopes, TOOL_SCOPES, VALID_SCOPES } from '@/lib/oauth/types';
import { type SerializableMenu, serializeMenu } from '../menu';

function buildMenu(overrides: Partial<SerializableMenu> = {}): SerializableMenu {
  return {
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    weekLabel: '2026-W35',
    status: 'building',
    weekStartDate: new Date('2026-08-24T00:00:00.000Z'),
    assignments: [],
    ...overrides,
  };
}

describe('serializeMenu', () => {
  it('serializes ids and dates to strings', () => {
    const output = serializeMenu(buildMenu());
    expect(output.id).toBe('507f1f77bcf86cd799439011');
    expect(output.weekLabel).toBe('2026-W35');
    expect(output.status).toBe('building');
    expect(output.weekStartDate).toBe('2026-08-24T00:00:00.000Z');
    expect(output.assignments).toEqual([]);
  });

  it('maps a cookbook assignment, exposing assignmentId and recipeId', () => {
    const assignmentId = new Types.ObjectId('507f1f77bcf86cd799439012');
    const recipeId = new Types.ObjectId('507f1f77bcf86cd799439013');
    const output = serializeMenu(
      buildMenu({
        assignments: [
          {
            _id: assignmentId,
            recipeId,
            title: 'Skillet Greek Chicken',
            source: 'cookbook',
            day: 'wed',
            mealSlot: 'dinner',
            addedAt: new Date('2026-08-24T00:00:00.000Z'),
          },
        ],
      }),
    );

    expect(output.assignments).toHaveLength(1);
    const [assignment] = output.assignments;
    expect(assignment?.assignmentId).toBe('507f1f77bcf86cd799439012');
    expect(assignment?.recipeId).toBe('507f1f77bcf86cd799439013');
    expect(assignment?.title).toBe('Skillet Greek Chicken');
    expect(assignment?.day).toBe('wed');
    expect(assignment?.mealSlot).toBe('dinner');
  });

  it('omits recipeId for a discovery assignment', () => {
    const output = serializeMenu(
      buildMenu({
        assignments: [
          {
            _id: new Types.ObjectId('507f1f77bcf86cd799439014'),
            title: 'Some Discovery Meal',
            source: 'discovery',
            day: 'thu',
            mealSlot: 'dinner',
            addedAt: new Date('2026-08-24T00:00:00.000Z'),
          },
        ],
      }),
    );

    const [assignment] = output.assignments;
    expect(assignment).toBeDefined();
    expect(assignment?.recipeId).toBeUndefined();
    expect(assignment?.source).toBe('discovery');
  });
});

describe('menu tool scopes', () => {
  it('registers menu scopes in VALID_SCOPES', () => {
    expect(VALID_SCOPES).toEqual(expect.arrayContaining(['menu:read', 'menu:write']));
  });

  it('gates each menu tool behind the expected scope', () => {
    expect(getToolScopes('menu_get_week')).toEqual(['menu:read']);
    expect(getToolScopes('menu_add_dinner')).toEqual(['menu:write']);
    expect(getToolScopes('menu_remove_assignment')).toEqual(['menu:write']);
    expect(getToolScopes('menu_send_survey')).toEqual(['menu:write']);
    expect(getToolScopes('menu_finalize')).toEqual(['menu:write']);
  });

  it('never gates a read tool behind a write scope', () => {
    expect(TOOL_SCOPES['menu_get_week']).not.toContain('menu:write');
  });
});
