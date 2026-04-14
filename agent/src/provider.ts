/**
 * provider.ts
 *
 * Provider abstraction — normalizes OpenRouter and Anthropic into a single
 * streaming interface so agent.ts stays model/vendor-agnostic.
 *
 * StreamEvent union covers every event agent.ts needs to react to:
 *   delta      — incremental text from the assistant
 *   tool_call  — the model wants to invoke a tool
 *   tool_result — result returned to the model (surfaced for logging)
 *   reasoning  — extended thinking text
 *   done       — stream finished, fullText is the complete assistant turn
 */

// Static type-only imports so the module loads without side-effects when only
// one provider's key is present. These are erased at runtime by TypeScript.
import type AnthropicSdk from '@anthropic-ai/sdk';

// ---------------------------------------------------------------------------
// StreamEvent — common event shape both providers must emit
// ---------------------------------------------------------------------------

export type StreamEvent =
  | { type: 'delta'; text: string; accumulated: string }
  | { type: 'tool_call'; id: string; name: string; args: unknown }
  | { type: 'tool_result'; callId: string; output: string }
  | { type: 'reasoning'; text: string }
  | { type: 'done'; fullText: string };

// ---------------------------------------------------------------------------
// Shared message type
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ---------------------------------------------------------------------------
// ProviderTool — minimal interface used by provider implementations.
// ---------------------------------------------------------------------------

export interface ProviderTool {
  name: string;
  description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (params: any, context: any) => Promise<unknown> | unknown;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface ProviderConfig {
  model: string;
  instructions: string;
  tools: ProviderTool[];
  maxSteps: number;
}

export interface Provider {
  readonly name: string;
  readonly defaultModel: string;
  chat(messages: ChatMessage[], config: ProviderConfig): AsyncGenerator<StreamEvent>;
}

// ---------------------------------------------------------------------------
// OpenRouterProvider
// ---------------------------------------------------------------------------

export class OpenRouterProvider implements Provider {
  readonly name = 'openrouter';
  readonly defaultModel = 'openrouter/auto';

  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async *chat(messages: ChatMessage[], config: ProviderConfig): AsyncGenerator<StreamEvent> {
    const { OpenRouter } = await import('@openrouter/sdk');
    const { stepCountIs } = await import('@openrouter/sdk/lib/stop-conditions');
    const { tool } = await import('@openrouter/sdk/lib/tool');
    const { z } = await import('zod');

    const client = new OpenRouter({ apiKey: this.apiKey });

    // Wrap ProviderTool[] into OpenRouter tool objects with passthrough schemas
    const orTools = config.tools.map((t) =>
      tool({
        name: t.name,
        description: t.description ?? '',
        inputSchema: z.object({}).passthrough(),
        execute: async (params: unknown) => {
          const result = await t.execute(params, {});
          return typeof result === 'string' ? result : JSON.stringify(result);
        },
      }),
    );

    const result = client.callModel({
      model: config.model,
      instructions: config.instructions,
      input: messages.map((m) => ({ role: m.role, content: m.content })),
      tools: orTools.length > 0 ? orTools : undefined,
      stopWhen: [stepCountIs(config.maxSteps)],
    });

    let fullText = '';

    for await (const item of result.getItemsStream()) {
      switch (item.type) {
        case 'message': {
          const content = (item as { type: string; content?: Array<{ type: string; text?: string }> }).content;
          const textContent = content?.find((c) => c.type === 'output_text');
          if (textContent?.text != null) {
            const newText = textContent.text;
            if (newText !== fullText) {
              const delta = newText.slice(fullText.length);
              fullText = newText;
              yield { type: 'delta', text: delta, accumulated: fullText };
            }
          }
          break;
        }
        case 'function_call': {
          const fc = item as { type: string; id?: string; callId?: string; name: string; arguments: string; status?: string };
          if (fc.status === 'completed') {
            yield {
              type: 'tool_call',
              id: fc.id ?? fc.callId ?? '',
              name: fc.name,
              args: JSON.parse(fc.arguments || '{}'),
            };
          }
          break;
        }
        case 'function_call_output': {
          const fco = item as { type: string; callId: string; output: string | unknown[] };
          const out = typeof fco.output === 'string' ? fco.output : JSON.stringify(fco.output);
          yield { type: 'tool_result', callId: fco.callId, output: out };
          break;
        }
        case 'reasoning': {
          const r = item as { type: string; content?: Array<{ type: string; text?: string }> | null };
          const rt = r.content?.find((c) => c.type === 'reasoning_text');
          if (rt?.text) {
            yield { type: 'reasoning', text: rt.text };
          }
          break;
        }
      }
    }

    if (!fullText) {
      fullText = await result.getText();
    }

    yield { type: 'done', fullText };
  }
}

// ---------------------------------------------------------------------------
// AnthropicProvider
// ---------------------------------------------------------------------------

type AContentBlock = AnthropicSdk.ContentBlockParam;
type AToolUse = AnthropicSdk.ToolUseBlock;
type AToolResult = AnthropicSdk.ToolResultBlockParam;
type AMessage = AnthropicSdk.MessageParam;
type ATool = AnthropicSdk.Tool;

export class AnthropicProvider implements Provider {
  readonly name = 'anthropic';
  readonly defaultModel = 'claude-opus-4-5';

  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async *chat(messages: ChatMessage[], config: ProviderConfig): AsyncGenerator<StreamEvent> {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: this.apiKey });

    const conversationMessages: AMessage[] = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const anthropicTools: ATool[] = config.tools.map((t) => ({
      name: t.name,
      description: t.description ?? '',
      input_schema: { type: 'object' as const, properties: {} },
    }));

    let fullText = '';
    let stepCount = 0;

    while (stepCount < config.maxSteps) {
      stepCount++;

      const stream = client.messages.stream({
        model: config.model,
        max_tokens: 4096,
        system: config.instructions,
        messages: conversationMessages,
        tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      });

      let currentText = '';

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            currentText += event.delta.text;
            fullText = currentText;
            yield { type: 'delta', text: event.delta.text, accumulated: fullText };
          } else if (event.delta.type === 'thinking_delta') {
            yield { type: 'reasoning', text: event.delta.thinking };
          }
        }
      }

      const finalMessage = await stream.finalMessage();
      const pendingToolUses = finalMessage.content.filter(
        (b): b is AToolUse => b.type === 'tool_use',
      );

      if (pendingToolUses.length === 0 || finalMessage.stop_reason !== 'tool_use') {
        break;
      }

      const toolResults: AToolResult[] = [];

      for (const toolUse of pendingToolUses) {
        yield { type: 'tool_call', id: toolUse.id, name: toolUse.name, args: toolUse.input };

        const matchedTool = config.tools.find((t) => t.name === toolUse.name);
        let output: string;

        if (matchedTool) {
          try {
            const result = await matchedTool.execute(toolUse.input, {});
            output = typeof result === 'string' ? result : JSON.stringify(result);
          } catch (err) {
            output = `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
        } else {
          output = `Error: tool "${toolUse.name}" not found`;
        }

        yield { type: 'tool_result', callId: toolUse.id, output };
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: output });
      }

      conversationMessages.push({ role: 'assistant', content: finalMessage.content as AContentBlock[] });
      conversationMessages.push({ role: 'user', content: toolResults as AContentBlock[] });
    }

    yield { type: 'done', fullText };
  }
}

// ---------------------------------------------------------------------------
// createProvider factory — auto-detects from env or explicit AGENT_PROVIDER
// ---------------------------------------------------------------------------

export type ProviderName = 'openrouter' | 'anthropic';

export function createProvider(overrideProvider?: ProviderName): Provider {
  const providerEnv = (overrideProvider ?? process.env.AGENT_PROVIDER ?? '').toLowerCase();

  if (providerEnv === 'anthropic') {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY is required when AGENT_PROVIDER=anthropic');
    return new AnthropicProvider(key);
  }

  // 'openrouter' or unset: prefer OpenRouter key, fall back to Anthropic
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) return new OpenRouterProvider(orKey);

  const anthKey = process.env.ANTHROPIC_API_KEY;
  if (anthKey) return new AnthropicProvider(anthKey);

  throw new Error(
    'No API key found. Set OPENROUTER_API_KEY or ANTHROPIC_API_KEY ' +
    '(and optionally AGENT_PROVIDER=openrouter|anthropic).',
  );
}
