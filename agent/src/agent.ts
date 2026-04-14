import { EventEmitter } from 'eventemitter3';
import {
  createProvider,
  type Provider,
  type ChatMessage,
  type ProviderTool,
  type ProviderName,
} from './provider.js';

export type { ChatMessage as Message };

// ---------------------------------------------------------------------------
// Agent events
// ---------------------------------------------------------------------------

export interface AgentEvents {
  'message:user': (message: ChatMessage) => void;
  'message:assistant': (message: ChatMessage) => void;
  'stream:start': () => void;
  'stream:delta': (delta: string, accumulated: string) => void;
  'stream:end': (fullText: string) => void;
  'tool:call': (name: string, args: unknown) => void;
  'tool:result': (callId: string, result: unknown) => void;
  'reasoning:update': (text: string) => void;
  'error': (error: Error) => void;
  'thinking:start': () => void;
  'thinking:end': () => void;
}

// ---------------------------------------------------------------------------
// Agent configuration
// ---------------------------------------------------------------------------

export interface AgentConfig {
  /** Explicit Provider instance. If omitted, auto-detected from env via createProvider(). */
  provider?: Provider;
  /**
   * Override provider by name ('openrouter' | 'anthropic').
   * Ignored when `provider` is supplied directly.
   */
  providerName?: ProviderName;
  /**
   * Model identifier — provider-specific string.
   * Falls back to AGENT_MODEL env var, then provider.defaultModel.
   */
  model?: string;
  instructions?: string;
  tools?: ProviderTool[];
  maxSteps?: number;
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export class Agent extends EventEmitter<AgentEvents> {
  private provider: Provider;
  private messages: ChatMessage[] = [];
  private config: {
    model: string;
    instructions: string;
    tools: ProviderTool[];
    maxSteps: number;
  };

  constructor(config: AgentConfig) {
    super();

    this.provider = config.provider ?? createProvider(config.providerName);

    const model =
      config.model ??
      process.env.AGENT_MODEL ??
      this.provider.defaultModel;

    this.config = {
      model,
      instructions: config.instructions ?? 'You are a helpful assistant.',
      tools: config.tools ?? [],
      maxSteps: config.maxSteps ?? 5,
    };
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  clearHistory(): void {
    this.messages = [];
  }

  setInstructions(instructions: string): void {
    this.config.instructions = instructions;
  }

  addTool(newTool: ProviderTool): void {
    this.config.tools.push(newTool);
  }

  /** Current provider name — useful for displaying in UI. */
  get providerName(): string {
    return this.provider.name;
  }

  /** Current model identifier. */
  get model(): string {
    return this.config.model;
  }

  async send(content: string): Promise<string> {
    const userMessage: ChatMessage = { role: 'user', content };
    this.messages.push(userMessage);
    this.emit('message:user', userMessage);
    this.emit('thinking:start');
    this.emit('stream:start');

    try {
      let fullText = '';

      const stream = this.provider.chat(this.messages, this.config);

      for await (const event of stream) {
        switch (event.type) {
          case 'delta':
            fullText = event.accumulated;
            this.emit('stream:delta', event.text, event.accumulated);
            break;
          case 'tool_call':
            this.emit('tool:call', event.name, event.args);
            break;
          case 'tool_result':
            this.emit('tool:result', event.callId, event.output);
            break;
          case 'reasoning':
            this.emit('reasoning:update', event.text);
            break;
          case 'done':
            fullText = event.fullText;
            break;
        }
      }

      this.emit('stream:end', fullText);

      const assistantMessage: ChatMessage = { role: 'assistant', content: fullText };
      this.messages.push(assistantMessage);
      this.emit('message:assistant', assistantMessage);

      return fullText;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', error);
      throw error;
    } finally {
      this.emit('thinking:end');
    }
  }

  /** Non-streaming variant — kept for API compatibility, delegates to send(). */
  async sendSync(content: string): Promise<string> {
    return this.send(content);
  }
}

export function createAgent(config: AgentConfig): Agent {
  return new Agent(config);
}
