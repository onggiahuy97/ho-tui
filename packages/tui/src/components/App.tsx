import React, { useReducer, useEffect, useCallback, useRef } from 'react';
import { Box, useApp, useInput } from 'ink';
import { AgentRuntime, SessionUsageTotals } from '@hotui/core';
import {
  TuiState,
  TuiAction,
  tuiReducer,
  getFilteredSlashCommands,
  SLASH_COMMANDS,
} from '../state';
import { StatusBar } from './StatusBar';
import { Transcript } from './Transcript';
import { InputBox } from './InputBox';
import { SlashMenu } from './SlashMenu';
import { ModelPicker } from './ModelPicker';
import { UsageStats } from './UsageStats';

interface AppProps {
  runtime: AgentRuntime;
  initialState: TuiState;
  onSwitchModel?: (profileName: string, usageTotals: SessionUsageTotals) => AgentRuntime | undefined;
}

export const App: React.FC<AppProps> = ({ runtime: initialRuntime, initialState, onSwitchModel }) => {
  const [state, dispatch] = useReducer(tuiReducer, initialState);
  const { exit } = useApp();
  const runtimeRef = useRef(initialRuntime);
  const inputRef = useRef('');

  useEffect(() => {
    const subscription = runtimeRef.current.events.subscribe();

    (async () => {
      for await (const event of subscription) {
        dispatch(event);
      }
    })();

    return () => {
      runtimeRef.current.events.complete();
    };
  }, []);

  // Re-subscribe when runtime changes (model switch)
  const switchRuntime = useCallback((newRuntime: AgentRuntime) => {
    runtimeRef.current.events.complete();
    runtimeRef.current = newRuntime;
    const subscription = newRuntime.events.subscribe();
    (async () => {
      for await (const event of subscription) {
        dispatch(event);
      }
    })();
  }, []);

  // Handle keyboard for slash menu & model picker overlays
  useInput(useCallback((_ch: string, key) => {
    if (key.ctrl && _ch === 'c') {
      runtimeRef.current.events.complete();
      exit();
      return;
    }

    // Model picker navigation
    if (state.modelPickerOpen) {
      if (key.escape) {
        dispatch({ type: 'model_picker_close' });
        return;
      }
      if (key.upArrow) {
        dispatch({ type: 'model_picker_navigate', direction: 'up' });
        return;
      }
      if (key.downArrow) {
        dispatch({ type: 'model_picker_navigate', direction: 'down' });
        return;
      }
      if (key.return) {
        const selected = state.availableModels[state.selectedModelIndex];
        if (selected && onSwitchModel) {
          const usageTotals = runtimeRef.current.getUsageTotals();
          const newRuntime = onSwitchModel(selected.profileName, usageTotals);
          if (newRuntime) {
            switchRuntime(newRuntime);
            dispatch({
              type: 'model_selected',
              profileName: selected.profileName,
              provider: selected.provider,
              model: selected.model,
            });
          }
        }
        return;
      }
      return;
    }

    // Slash menu navigation
    if (state.slashMenuOpen) {
      if (key.escape) {
        dispatch({ type: 'slash_menu_close' });
        return;
      }
      if (key.upArrow) {
        dispatch({ type: 'slash_menu_navigate', direction: 'up' });
        return;
      }
      if (key.downArrow) {
        dispatch({ type: 'slash_menu_navigate', direction: 'down' });
        return;
      }
      if (key.return) {
        const filtered = getFilteredSlashCommands(state.slashFilter);
        const selected = filtered[state.selectedSlashIndex];
        if (selected) {
          executeSlashCommand(selected.name);
        }
        dispatch({ type: 'slash_menu_close' });
        return;
      }
      return;
    }
  }, [state.slashMenuOpen, state.modelPickerOpen, state.slashFilter, state.selectedSlashIndex, state.selectedModelIndex, state.availableModels, onSwitchModel, switchRuntime, exit]));

  const executeSlashCommand = useCallback((command: string) => {
    switch (command) {
      case '/model':
        dispatch({ type: 'model_picker_open' });
        break;
      case '/clear':
        dispatch({ type: 'clear_transcript' });
        break;
      case '/help': {
        const helpText = SLASH_COMMANDS.map((c) => `${c.name} — ${c.description}`).join('\n');
        dispatch({ type: 'system_message', content: helpText });
        break;
      }
    }
  }, []);

  const handleSubmit = useCallback((text: string) => {
    // If we're in a menu, don't send — the useInput handler above deals with Enter
    if (state.slashMenuOpen || state.modelPickerOpen) {
      return;
    }

    // Handle slash commands typed and submitted directly
    if (text.startsWith('/')) {
      const match = SLASH_COMMANDS.find((c) => c.name === text);
      if (match) {
        executeSlashCommand(match.name);
        return;
      }
      dispatch({
        type: 'system_message',
        content: `Unknown command: ${text}. Type /help for available commands.`,
      });
      return;
    }

    dispatch({ type: 'set_streaming', value: true });
    runtimeRef.current.run(text).catch(() => {
      // Errors are published as runtime_error events on the event bus
    });
  }, [state.slashMenuOpen, state.modelPickerOpen, executeSlashCommand]);

  const handleInputChange = useCallback((value: string) => {
    inputRef.current = value;
    if (value.startsWith('/')) {
      const filter = value.slice(1);
      if (!state.slashMenuOpen) {
        dispatch({ type: 'slash_menu_open', filter });
      } else {
        dispatch({ type: 'slash_menu_update_filter', filter });
      }
    } else if (state.slashMenuOpen) {
      dispatch({ type: 'slash_menu_close' });
    }
  }, [state.slashMenuOpen]);

  const filteredCommands = getFilteredSlashCommands(state.slashFilter);

  return (
    <Box flexDirection="column">
      <StatusBar state={state} />
      <Transcript entries={state.transcript} />
      {state.slashMenuOpen && (
        <SlashMenu
          commands={filteredCommands}
          selectedIndex={state.selectedSlashIndex}
          filter={state.slashFilter}
        />
      )}
      {state.modelPickerOpen && (
        <ModelPicker
          models={state.availableModels}
          selectedIndex={state.selectedModelIndex}
          currentProfile={state.profileName}
        />
      )}
      <InputBox
        disabled={state.streaming || state.modelPickerOpen}
        onSubmit={handleSubmit}
        onInputChange={handleInputChange}
      />
      <UsageStats totals={state.usageTotals} />
    </Box>
  );
};
