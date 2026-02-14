import { describe, expect, it } from 'vitest';
import { MockProvider } from '../src/mock-provider';
import { ProviderChatRequest } from '../src/types';

const request: ProviderChatRequest = {
  model: 'mock-1',
  messages: [
    { role: 'user', content: 'Say hello' },
  ],
};

describe('MockProvider', () => {
  it('streams tokens then completion metadata in order', async () => {
    const provider = new MockProvider();
    const events = [] as string[];

    for await (const event of provider.streamChat(request)) {
      events.push(event.type);
    }

    expect(events[0]).toBe('assistant_token_delta');
    expect(events).toContain('assistant_message_end');
    expect(events[events.length - 1]).toBe('usage_update');
  });
});
