import { describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { AgentRuntime } from '../src/runtime';
import { SessionStore } from '../src/session-store';
import { EventBus } from '../src/event-bus';
import { CoreEvent } from '../src/events';
import { ModelProvider, ProviderChatRequest, ProviderEvent } from '@hotui/providers';

class UsageOnlyProvider implements ModelProvider {
  readonly id = 'usage-only';

  async *streamChat(_request: ProviderChatRequest): AsyncIterable<ProviderEvent> {
    yield {
      type: 'assistant_message_end',
      provider: this.id,
      model: 'usage-model',
      message: 'ok',
      timestamp: new Date().toISOString(),
    };

    yield {
      type: 'usage_update',
      provider: this.id,
      model: 'usage-model',
      usage: { inputTokens: 5, outputTokens: 7 },
      timestamp: new Date().toISOString(),
    };

    yield {
      type: 'usage_update',
      provider: this.id,
      model: 'usage-model',
      usage: { inputTokens: 3, outputTokens: 4 },
      timestamp: new Date().toISOString(),
    };
  }
}

describe('AgentRuntime usage tracking', () => {
  it('emits cumulative session_usage events', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'runtime-usage-'));
    const sessionStore = new SessionStore({ directory: tempDir, sessionId: 'runtime-usage' });
    const eventBus = new EventBus();
    const runtime = new AgentRuntime({
      provider: new UsageOnlyProvider(),
      sessionStore,
      eventBus,
      defaultModel: 'usage-model',
    });

    const subscription = runtime.events.subscribe();
    const events: CoreEvent[] = [];
    const collector = (async () => {
      for await (const event of subscription) {
        events.push(event);
      }
    })();

    await runtime.run('hello');
    runtime.events.complete();
    await collector;

    const sessionEvents = events.filter((event): event is Extract<CoreEvent, { type: 'session_usage' }> => event.type === 'session_usage');
    expect(sessionEvents).toHaveLength(2);
    expect(sessionEvents[1].totals).toEqual({ inputTokens: 8, outputTokens: 11, turns: 2 });
    expect(runtime.getUsageTotals()).toEqual({ inputTokens: 8, outputTokens: 11, turns: 2 });
  });
});
