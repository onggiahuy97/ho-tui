import { CoreEvent } from '@hotui/core';

export interface TranscriptEntry {
  role: 'user' | 'assistant' | 'error' | 'system';
  content: string;
  timestamp: string;
}

export interface ModelOption {
  profileName: string;
  provider: string;
  model: string;
  description?: string;
}

export interface SlashCommand {
  name: string;
  description: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: '/model', description: 'Switch the active model' },
  { name: '/clear', description: 'Clear the conversation' },
  { name: '/help', description: 'Show available commands' },
];

export interface TuiState {
  transcript: TranscriptEntry[];
  streaming: boolean;
  activeProvider: string;
  activeModel: string;
  sessionId: string;
  profileName: string;
  // Slash menu
  slashMenuOpen: boolean;
  slashFilter: string;
  selectedSlashIndex: number;
  // Model picker
  modelPickerOpen: boolean;
  selectedModelIndex: number;
  availableModels: ModelOption[];
}

export interface InitialStateOptions {
  activeProvider: string;
  activeModel: string;
  sessionId: string;
  profileName: string;
  availableModels?: ModelOption[];
}

export function createInitialState(opts: InitialStateOptions): TuiState {
  return {
    transcript: [],
    streaming: false,
    activeProvider: opts.activeProvider,
    activeModel: opts.activeModel,
    sessionId: opts.sessionId,
    profileName: opts.profileName,
    slashMenuOpen: false,
    slashFilter: '',
    selectedSlashIndex: 0,
    modelPickerOpen: false,
    selectedModelIndex: 0,
    availableModels: opts.availableModels ?? [],
  };
}

// Local UI actions (not from the event bus)
export type TuiAction =
  | CoreEvent
  | { type: 'slash_menu_open'; filter: string }
  | { type: 'slash_menu_close' }
  | { type: 'slash_menu_update_filter'; filter: string }
  | { type: 'slash_menu_navigate'; direction: 'up' | 'down' }
  | { type: 'model_picker_open' }
  | { type: 'model_picker_close' }
  | { type: 'model_picker_navigate'; direction: 'up' | 'down' }
  | { type: 'model_selected'; profileName: string; provider: string; model: string }
  | { type: 'clear_transcript' }
  | { type: 'system_message'; content: string };

export function getFilteredSlashCommands(filter: string): SlashCommand[] {
  if (!filter) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((cmd) =>
    cmd.name.toLowerCase().startsWith('/' + filter.toLowerCase()),
  );
}

export function tuiReducer(state: TuiState, action: TuiAction): TuiState {
  switch (action.type) {
    // --- Slash menu actions ---
    case 'slash_menu_open':
      return {
        ...state,
        slashMenuOpen: true,
        slashFilter: action.filter,
        selectedSlashIndex: 0,
      };

    case 'slash_menu_close':
      return {
        ...state,
        slashMenuOpen: false,
        slashFilter: '',
        selectedSlashIndex: 0,
      };

    case 'slash_menu_update_filter': {
      const filtered = getFilteredSlashCommands(action.filter);
      return {
        ...state,
        slashFilter: action.filter,
        selectedSlashIndex: Math.min(state.selectedSlashIndex, Math.max(0, filtered.length - 1)),
      };
    }

    case 'slash_menu_navigate': {
      const filtered = getFilteredSlashCommands(state.slashFilter);
      if (filtered.length === 0) return state;
      const delta = action.direction === 'up' ? -1 : 1;
      const next = (state.selectedSlashIndex + delta + filtered.length) % filtered.length;
      return { ...state, selectedSlashIndex: next };
    }

    // --- Model picker actions ---
    case 'model_picker_open':
      return {
        ...state,
        slashMenuOpen: false,
        modelPickerOpen: true,
        selectedModelIndex: state.availableModels.findIndex(
          (m) => m.profileName === state.profileName,
        ),
      };

    case 'model_picker_close':
      return { ...state, modelPickerOpen: false, selectedModelIndex: 0 };

    case 'model_picker_navigate': {
      if (state.availableModels.length === 0) return state;
      const delta = action.direction === 'up' ? -1 : 1;
      const next =
        (state.selectedModelIndex + delta + state.availableModels.length) %
        state.availableModels.length;
      return { ...state, selectedModelIndex: next };
    }

    case 'model_selected':
      return {
        ...state,
        modelPickerOpen: false,
        activeProvider: action.provider,
        activeModel: action.model,
        profileName: action.profileName,
        transcript: [
          ...state.transcript,
          {
            role: 'system' as const,
            content: `Switched to ${action.provider}/${action.model}`,
            timestamp: new Date().toISOString(),
          },
        ],
      };

    case 'clear_transcript':
      return { ...state, transcript: [] };

    case 'system_message':
      return {
        ...state,
        transcript: [
          ...state.transcript,
          {
            role: 'system' as const,
            content: action.content,
            timestamp: new Date().toISOString(),
          },
        ],
      };

    // --- Core events (from event bus) ---
    case 'user_message':
      return {
        ...state,
        transcript: [
          ...state.transcript,
          { role: 'user', content: action.content, timestamp: action.timestamp },
        ],
      };

    case 'assistant_token_delta': {
      const last = state.transcript[state.transcript.length - 1];
      if (last && last.role === 'assistant') {
        const updated = [...state.transcript];
        updated[updated.length - 1] = {
          ...last,
          content: last.content + action.token,
        };
        return { ...state, transcript: updated, streaming: true };
      }

      return {
        ...state,
        streaming: true,
        transcript: [
          ...state.transcript,
          { role: 'assistant', content: action.token, timestamp: action.timestamp },
        ],
      };
    }

    case 'assistant_message_end': {
      const last = state.transcript[state.transcript.length - 1];
      if (last && last.role === 'assistant') {
        const updated = [...state.transcript];
        updated[updated.length - 1] = {
          ...last,
          content: action.message,
        };
        return { ...state, transcript: updated, streaming: false };
      }

      return {
        ...state,
        streaming: false,
        transcript: [
          ...state.transcript,
          { role: 'assistant', content: action.message, timestamp: action.timestamp },
        ],
      };
    }

    case 'error':
      return {
        ...state,
        streaming: false,
        transcript: [
          ...state.transcript,
          { role: 'error', content: action.error.message, timestamp: action.timestamp },
        ],
      };

    case 'runtime_error':
      return {
        ...state,
        streaming: false,
        transcript: [
          ...state.transcript,
          { role: 'error', content: action.message, timestamp: action.timestamp },
        ],
      };

    default:
      return state;
  }
}
