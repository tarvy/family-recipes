/**
 * Scripted language model for capture tests. Each generate call answers
 * with the next tool call in the script. Never touches the network.
 */

import { MockLanguageModelV4 } from 'ai/test';

type GenerateResult = Awaited<ReturnType<MockLanguageModelV4['doGenerate']>>;

export interface ScriptedToolCall {
  readonly toolName: string;
  readonly input: Record<string, unknown>;
}

export function toolCall(toolName: string, input: Record<string, unknown>): ScriptedToolCall {
  return { toolName, input };
}

export function repeat(call: ScriptedToolCall, times: number): ScriptedToolCall[] {
  return Array.from({ length: times }, () => call);
}

function respond(call: ScriptedToolCall, step: number): GenerateResult {
  return {
    content: [
      {
        type: 'tool-call',
        toolCallId: `call-${step}`,
        toolName: call.toolName,
        input: JSON.stringify(call.input),
      },
    ],
    finishReason: { unified: 'tool-calls', raw: undefined },
    usage: {
      inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 0, text: 0, reasoning: 0 },
    },
    warnings: [],
  };
}

export function scriptedModel(script: readonly ScriptedToolCall[]): MockLanguageModelV4 {
  let step = 0;
  return new MockLanguageModelV4({
    doGenerate: async () => {
      const call = script[step];
      if (!call) {
        throw new Error(`Scripted model has no call for step ${step}`);
      }
      step += 1;
      return respond(call, step);
    },
  });
}
