import { describe, it, expect } from 'vitest';
import { createInitialState, tuiReducer, TuiState } from '../src/state';
import { CoreEvent } from '@hotui/core';

function makeState(overrides?: Partial<TuiState>): TuiState {
  return {
    ...createInitialState({
      activeProvider: 'mock',
      activeModel: 'mock-1',
      sessionId: 'test-session',
      profileName: 'mock',
    }),
    ...overrides,
  };
}

describe('tuiReducer', () => {
  it('appends user message', () => {
    const state = makeState();
    const event: CoreEvent = {
      type: 'user_message',
      id: '1',
      content: 'Hello',
      timestamp: '2024-01-01T00:00:00.000Z',
    };
    const next = tuiReducer(state, event);
    expect(next.transcript).toHaveLength(1);
    expect(next.transcript[0]).toEqual({
      role: 'user',
      content: 'Hello',
      timestamp: '2024-01-01T00:00:00.000Z',
    });
  });

  it('creates assistant entry on first token delta', () => {
    const state = makeState();
    const event: CoreEvent = {
      type: 'assistant_token_delta',
      provider: 'mock',
      model: 'mock-1',
      token: 'Hi',
      timestamp: '2024-01-01T00:00:01.000Z',
    };
    const next = tuiReducer(state, event);
    expect(next.streaming).toBe(true);
    expect(next.transcript).toHaveLength(1);
    expect(next.transcript[0]).toEqual({
      role: 'assistant',
      content: 'Hi',
      timestamp: '2024-01-01T00:00:01.000Z',
    });
  });

  it('accumulates token deltas into existing assistant entry', () => {
    const state = makeState({
      transcript: [
        { role: 'assistant', content: 'Hi', timestamp: '2024-01-01T00:00:01.000Z' },
      ],
    });
    const event: CoreEvent = {
      type: 'assistant_token_delta',
      provider: 'mock',
      model: 'mock-1',
      token: ' there',
      timestamp: '2024-01-01T00:00:02.000Z',
    };
    const next = tuiReducer(state, event);
    expect(next.transcript).toHaveLength(1);
    expect(next.transcript[0].content).toBe('Hi there');
  });

  it('finalizes assistant entry on message end', () => {
    const state = makeState({
      streaming: true,
      transcript: [
        { role: 'assistant', content: 'Hi th', timestamp: '2024-01-01T00:00:01.000Z' },
      ],
    });
    const event: CoreEvent = {
      type: 'assistant_message_end',
      provider: 'mock',
      model: 'mock-1',
      message: 'Hi there!',
      timestamp: '2024-01-01T00:00:03.000Z',
    };
    const next = tuiReducer(state, event);
    expect(next.streaming).toBe(false);
    expect(next.transcript).toHaveLength(1);
    expect(next.transcript[0].content).toBe('Hi there!');
  });

  it('handles provider error', () => {
    const state = makeState();
    const event: CoreEvent = {
      type: 'error',
      provider: 'mock',
      model: 'mock-1',
      error: { message: 'Something went wrong' },
      timestamp: '2024-01-01T00:00:00.000Z',
    };
    const next = tuiReducer(state, event);
    expect(next.streaming).toBe(false);
    expect(next.transcript).toHaveLength(1);
    expect(next.transcript[0]).toEqual({
      role: 'error',
      content: 'Something went wrong',
      timestamp: '2024-01-01T00:00:00.000Z',
    });
  });

  it('handles runtime error', () => {
    const state = makeState();
    const event: CoreEvent = {
      type: 'runtime_error',
      id: '1',
      message: 'Runtime failure',
      timestamp: '2024-01-01T00:00:00.000Z',
    };
    const next = tuiReducer(state, event);
    expect(next.streaming).toBe(false);
    expect(next.transcript).toHaveLength(1);
    expect(next.transcript[0].role).toBe('error');
    expect(next.transcript[0].content).toBe('Runtime failure');
  });

  it('ignores usage_update events', () => {
    const state = makeState();
    const event: CoreEvent = {
      type: 'usage_update',
      provider: 'mock',
      model: 'mock-1',
      usage: { inputTokens: 10, outputTokens: 20 },
      timestamp: '2024-01-01T00:00:00.000Z',
    };
    const next = tuiReducer(state, event);
    expect(next).toBe(state);
  });

  it('tracks session usage totals', () => {
    const state = makeState();
    const event: CoreEvent = {
      type: 'session_usage',
      totals: { inputTokens: 42, outputTokens: 21, turns: 2 },
      timestamp: '2024-01-01T00:00:10.000Z',
    };
    const next = tuiReducer(state, event);
    expect(next.usageTotals).toEqual({ inputTokens: 42, outputTokens: 21, turns: 2 });
  });

  it('handles full multi-turn sequence', () => {
    let state = makeState();

    // User sends message
    state = tuiReducer(state, {
      type: 'user_message',
      id: '1',
      content: 'Hello',
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    // Assistant streams tokens
    state = tuiReducer(state, {
      type: 'assistant_token_delta',
      provider: 'mock',
      model: 'mock-1',
      token: 'Mock',
      timestamp: '2024-01-01T00:00:01.000Z',
    });
    state = tuiReducer(state, {
      type: 'assistant_token_delta',
      provider: 'mock',
      model: 'mock-1',
      token: ' response',
      timestamp: '2024-01-01T00:00:02.000Z',
    });

    // Assistant finishes
    state = tuiReducer(state, {
      type: 'assistant_message_end',
      provider: 'mock',
      model: 'mock-1',
      message: 'Mock response to: Hello',
      timestamp: '2024-01-01T00:00:03.000Z',
    });

    // Usage update (ignored)
    state = tuiReducer(state, {
      type: 'usage_update',
      provider: 'mock',
      model: 'mock-1',
      usage: { inputTokens: 5, outputTokens: 10 },
      timestamp: '2024-01-01T00:00:04.000Z',
    });

    // Second turn
    state = tuiReducer(state, {
      type: 'user_message',
      id: '2',
      content: 'Follow up',
      timestamp: '2024-01-01T00:00:05.000Z',
    });

    state = tuiReducer(state, {
      type: 'assistant_token_delta',
      provider: 'mock',
      model: 'mock-1',
      token: 'Reply',
      timestamp: '2024-01-01T00:00:06.000Z',
    });
    state = tuiReducer(state, {
      type: 'assistant_message_end',
      provider: 'mock',
      model: 'mock-1',
      message: 'Reply to follow up',
      timestamp: '2024-01-01T00:00:07.000Z',
    });

    expect(state.transcript).toHaveLength(4);
    expect(state.transcript[0]).toMatchObject({ role: 'user', content: 'Hello' });
    expect(state.transcript[1]).toMatchObject({ role: 'assistant', content: 'Mock response to: Hello' });
    expect(state.transcript[2]).toMatchObject({ role: 'user', content: 'Follow up' });
    expect(state.transcript[3]).toMatchObject({ role: 'assistant', content: 'Reply to follow up' });
    expect(state.streaming).toBe(false);
  });
});
