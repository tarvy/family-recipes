/**
 * Shared MCP tool helpers.
 */

const TOOL_CONTENT_TYPE_TEXT = 'text';

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
