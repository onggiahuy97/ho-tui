import { CoreEvent } from '@hotui/core';

export interface TranscriptEntry {
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: string;
}

export interface TuiState {
  transcript: TranscriptEntry[];
  streaming: boolean;
  activeProvider: string;
  activeModel: string;
  sessionId: string;
  profileName: string;
}

export interface InitialStateOptions {
  activeProvider: string;
  activeModel: string;
  sessionId: string;
  profileName: string;
}

export function createInitialState(opts: InitialStateOptions): TuiState {
  return {
    transcript: [],
    streaming: false,
    activeProvider: opts.activeProvider,
    activeModel: opts.activeModel,
    sessionId: opts.sessionId,
    profileName: opts.profileName,
  };
}

export function tuiReducer(state: TuiState, event: CoreEvent): TuiState {
  switch (event.type) {
    case 'user_message':
      return {
        ...state,
        transcript: [
          ...state.transcript,
          { role: 'user', content: event.content, timestamp: event.timestamp },
        ],
      };

    case 'assistant_token_delta': {
      const last = state.transcript[state.transcript.length - 1];
      if (last && last.role === 'assistant') {
        const updated = [...state.transcript];
        updated[updated.length - 1] = {
          ...last,
          content: last.content + event.token,
        };
        return { ...state, transcript: updated, streaming: true };
      }

      return {
        ...state,
        streaming: true,
        transcript: [
          ...state.transcript,
          { role: 'assistant', content: event.token, timestamp: event.timestamp },
        ],
      };
    }

    case 'assistant_message_end': {
      const last = state.transcript[state.transcript.length - 1];
      if (last && last.role === 'assistant') {
        const updated = [...state.transcript];
        updated[updated.length - 1] = {
          ...last,
          content: event.message,
        };
        return { ...state, transcript: updated, streaming: false };
      }

      return {
        ...state,
        streaming: false,
        transcript: [
          ...state.transcript,
          { role: 'assistant', content: event.message, timestamp: event.timestamp },
        ],
      };
    }

    case 'error':
      return {
        ...state,
        streaming: false,
        transcript: [
          ...state.transcript,
          { role: 'error', content: event.error.message, timestamp: event.timestamp },
        ],
      };

    case 'runtime_error':
      return {
        ...state,
        streaming: false,
        transcript: [
          ...state.transcript,
          { role: 'error', content: event.message, timestamp: event.timestamp },
        ],
      };

    default:
      return state;
  }
}
