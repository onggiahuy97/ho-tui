import { randomUUID } from 'node:crypto';
import {
  ModelProvider,
  ProviderChatMessage,
  ProviderChatRequest,
  UsageUpdateEvent,
} from '@hotui/providers';
import { CoreEvent, RuntimeErrorEvent, SessionUsageTotals, UserMessageEvent } from './events';
import { EventBus } from './event-bus';
import { SessionStore } from './session-store';

export interface AgentRuntimeOptions {
  provider: ModelProvider;
  sessionStore: SessionStore;
  eventBus?: EventBus;
  defaultModel?: string;
  systemPrompt?: string;
  initialUsageTotals?: SessionUsageTotals;
}

export class AgentRuntime {
  private readonly provider: ModelProvider;
  private readonly eventBus: EventBus;
  private readonly sessionStore: SessionStore;
  private readonly defaultModel?: string;
  private readonly history: ProviderChatMessage[] = [];
  private readonly usageTotals: SessionUsageTotals;

  constructor(options: AgentRuntimeOptions) {
    this.provider = options.provider;
    this.sessionStore = options.sessionStore;
    this.eventBus = options.eventBus ?? new EventBus();
    this.defaultModel = options.defaultModel;

    if (options.systemPrompt) {
      this.history.push({ role: 'system', content: options.systemPrompt });
    }

    this.usageTotals = {
      inputTokens: options.initialUsageTotals?.inputTokens ?? 0,
      outputTokens: options.initialUsageTotals?.outputTokens ?? 0,
      turns: options.initialUsageTotals?.turns ?? 0,
      ...(options.initialUsageTotals?.cost != null
        ? { cost: options.initialUsageTotals.cost }
        : {}),
    };
  }

  get events(): EventBus {
    return this.eventBus;
  }

  async run(prompt: string, metadata?: { model?: string }): Promise<void> {
    const timestamp = new Date().toISOString();
    const userEvent: UserMessageEvent = {
      type: 'user_message',
      id: randomUUID(),
      content: prompt,
      timestamp,
    };

    this.history.push({ role: 'user', content: prompt });
    await this.publish(userEvent);

    const request: ProviderChatRequest = {
      model: metadata?.model ?? this.defaultModel ?? 'mock-1',
      messages: this.history,
    };

    try {
      for await (const event of this.provider.streamChat(request)) {
        await this.publish(event);
        if (event.type === 'usage_update') {
          await this.handleUsageUpdate(event);
        }
        if (event.type === 'assistant_message_end') {
          this.history.push({ role: 'assistant', content: event.message });
        }
      }
    } catch (error) {
      const runtimeError: RuntimeErrorEvent = {
        type: 'runtime_error',
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };

      await this.publish(runtimeError);
      throw error;
    }
  }

  getUsageTotals(): SessionUsageTotals {
    return { ...this.usageTotals };
  }

  private async publish(event: CoreEvent): Promise<void> {
    await this.sessionStore.append(event);
    this.eventBus.emit(event);
  }

  private async handleUsageUpdate(event: UsageUpdateEvent): Promise<void> {
    this.usageTotals.inputTokens += event.usage.inputTokens;
    this.usageTotals.outputTokens += event.usage.outputTokens;
    this.usageTotals.turns += 1;
    if (event.usage.cost != null) {
      const existingCost = this.usageTotals.cost ?? 0;
      this.usageTotals.cost = existingCost + event.usage.cost;
    }

    const usageEventTimestamp = new Date().toISOString();
    const sessionUsageEvent: CoreEvent = {
      type: 'session_usage',
      timestamp: usageEventTimestamp,
      totals: { ...this.usageTotals },
    };
    await this.publish(sessionUsageEvent);
  }
}
