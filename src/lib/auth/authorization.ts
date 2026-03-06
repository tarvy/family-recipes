/**
 * Authorization helpers for role-based access control.
 *
 * Centralizes role checks so API routes and pages use consistent logic.
 * Three tiers: owner > family > friend.
 *
 * - owner/family = "family roles" (full write access)
 * - friend = read-only (can rate and log cooks, but not create/edit/delete)
 */

import type { UserRole } from '@/db/types';

/** Roles with write access to recipes and shopping lists. */
const FAMILY_ROLES: ReadonlySet<UserRole> = new Set(['owner', 'family']);

/** Check if a user role has family-level (write) access. */
export function isFamilyRole(role: UserRole): boolean {
  return FAMILY_ROLES.has(role);
}
