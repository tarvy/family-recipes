/**
 * Shared MCP tool helpers.
 */

import type { Types } from 'mongoose';
import { connectDB } from '@/db/connection';
import { User } from '@/db/models';
import { isValidEmail, normalizeEmail } from '@/lib/auth/allowlist';
import { traceDbQuery } from '@/lib/telemetry';

const TOOL_CONTENT_TYPE_TEXT = 'text';
const USER_COLLECTION = 'users';

export type ToolContent = {
  type: 'text';
  text: string;
};

export type ToolResult<T> = {
  content: ToolContent[];
  structuredContent: T;
};

export function buildToolResult<T>(payload: T): ToolResult<T> {
  return {
    content: [{ type: TOOL_CONTENT_TYPE_TEXT, text: JSON.stringify(payload) }],
    structuredContent: payload,
  };
}

export interface ResolvedUser {
  id: Types.ObjectId;
  email: string;
}

/**
 * Resolve the acting user for an MCP tool call. Falls back to OWNER_EMAIL when
 * no explicit email is supplied — the single-user default for this app.
 */
export async function resolveMcpUser(userEmail?: string): Promise<ResolvedUser> {
  const email = userEmail?.trim() || process.env.OWNER_EMAIL?.trim();
  if (!email) {
    throw new Error('User email is required');
  }

  if (!isValidEmail(email)) {
    throw new Error('User email is invalid');
  }

  await connectDB();

  const normalized = normalizeEmail(email);
  const user = await traceDbQuery('findOne', USER_COLLECTION, async () => {
    return User.findOne({ email: normalized });
  });

  if (!user) {
    throw new Error('User not found for MCP request');
  }

  return {
    id: user._id as Types.ObjectId,
    email: user.email,
  };
}
