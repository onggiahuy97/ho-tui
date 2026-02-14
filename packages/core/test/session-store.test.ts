import { describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { SessionStore } from '../src/session-store';
import { Redactor } from '../src/utils/redact';
import { CoreEvent } from '../src/events';
import { ProviderEvent } from '@hotui/providers';

describe('SessionStore', () => {
  it('serializes and replays events with redaction applied', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'session-store-'));
    const store = new SessionStore({
      directory: tempDir,
      sessionId: 'unit-test',
      redactor: new Redactor(['secret']),
    });

    const userEvent: CoreEvent = {
      type: 'user_message',
      id: randomUUID(),
      content: 'Test input',
      timestamp: new Date().toISOString(),
    };

    const providerEvent: ProviderEvent = {
      type: 'assistant_token_delta',
      provider: 'mock',
      model: 'mock-1',
      token: 'secret token',
      timestamp: new Date().toISOString(),
    };

    await store.append(userEvent);
    await store.append(providerEvent);

    const replayed: CoreEvent[] = [];
    for await (const event of store.replay()) {
      replayed.push(event);
    }

    expect(replayed).toHaveLength(2);
    expect(replayed[0]).toStrictEqual(userEvent);

    const delta = replayed[1];
    if (delta.type !== 'assistant_token_delta') {
      throw new Error('unexpected event type');
    }

    expect(delta.token).toBe('[REDACTED] token');
  });
});
