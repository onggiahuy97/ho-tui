import React, { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { Box, useApp, useInput } from 'ink';
import * as path from 'path';
import { AgentRuntime, SessionUsageTotals } from '@hotui/core';
import {
  TuiState,
  TuiAction,
  tuiReducer,
  getFilteredSlashCommands,
  getActiveMention,
  SLASH_COMMANDS,
} from '../state';
import { listFiles, readFileAttachment } from '../utils/file-search';
import type { ModelProvider } from '@hotui/providers';
import { StatusBar } from './StatusBar';
import { Transcript } from './Transcript';
import { InputBox } from './InputBox';
import { SlashMenu } from './SlashMenu';
import { ModelPicker } from './ModelPicker';
import { FilePicker } from './FilePicker';
import { UsageStats } from './UsageStats';

interface AppProps {
  runtime: AgentRuntime;
  initialState: TuiState;
  onSwitchModel?: (profileName: string, usageTotals: SessionUsageTotals) => AgentRuntime | undefined;
  /** Provider and model for job parsing (optional; needed for /job command). */
  jobParseProvider?: ModelProvider;
  jobParseModel?: string;
  databaseUrl?: string;
}

export const App: React.FC<AppProps> = ({ runtime: initialRuntime, initialState, onSwitchModel, jobParseProvider, jobParseModel, databaseUrl }) => {
  const [state, dispatch] = useReducer(tuiReducer, initialState);
  const { exit } = useApp();
  const runtimeRef = useRef(initialRuntime);
  const [inputText, setInputText] = useState('');

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
      case '/job': {
        dispatch({ type: 'system_message', content: 'Usage: /job <url> — Enter a job posting URL to parse and save.' });
        break;
      }
      case '/exit':
        runtimeRef.current.events.complete();
        exit();
        break;
    }
  }, [exit]);

  const handleSubmit = useCallback(async (text: string) => {
    // If we're in a menu, don't send
    if (state.slashMenuOpen || state.modelPickerOpen || state.fileMentionOpen) {
      return;
    }

    // Handle slash commands typed and submitted directly
    if (text.startsWith('/')) {
      // Handle /job <url> with inline argument
      if (text.startsWith('/job ')) {
        const jobUrl = text.slice(5).trim();
        if (!jobUrl) {
          dispatch({ type: 'system_message', content: 'Usage: /job <url>' });
          return;
        }
        if (!jobParseProvider || !jobParseModel || !databaseUrl) {
          dispatch({
            type: 'system_message',
            content: 'Job parsing is not configured. Set HOTUI_DATABASE_URL in your .env file.',
          });
          return;
        }
        dispatch({ type: 'system_message', content: `Parsing job: ${jobUrl}` });
        (async () => {
          try {
            const { parseAndSaveJob, createDatabase: createDb } = await import('@hotui/jobs');
            const db = createDb(databaseUrl);
            const job = await parseAndSaveJob({
              url: jobUrl,
              provider: jobParseProvider,
              model: jobParseModel,
              db,
              onProgress: (msg) => dispatch({ type: 'system_message', content: msg }),
            });
            const summary = [
              `**Job saved** (${job.id})`,
              job.title ? `Title: ${job.title}` : null,
              job.company ? `Company: ${job.company}` : null,
              job.location ? `Location: ${job.location}` : null,
              job.salary ? `Salary: ${job.salary}` : null,
              job.postedDate ? `Posted: ${job.postedDate}` : null,
            ].filter(Boolean).join('\n');
            dispatch({ type: 'system_message', content: summary });
          } catch (error) {
            dispatch({
              type: 'system_message',
              content: `Job parse error: ${error instanceof Error ? error.message : error}`,
            });
          }
        })();
        return;
      }

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

    // Resolve @file mentions
    const mentionRe = /@(\S+)/g;
    const mentions = [...text.matchAll(mentionRe)];
    let augmented = text;
    if (mentions.length > 0) {
      const blocks: string[] = [];
      for (const [, relPath] of mentions) {
        const absPath = path.resolve(process.cwd(), relPath);
        const block = readFileAttachment(absPath, relPath);
        blocks.push(block);
      }
      augmented = blocks.join('\n') + '\n\n' + text;
    }

    dispatch({ type: 'set_streaming', value: true });
    runtimeRef.current.run(augmented).catch(() => {
      // Errors are published as runtime_error events on the event bus
    });
  }, [state.slashMenuOpen, state.modelPickerOpen, state.fileMentionOpen, executeSlashCommand]);

  // Handle keyboard for slash menu, model picker, and file picker overlays
  useInput(useCallback((_ch: string, key) => {
    if (key.ctrl && _ch === 'c') {
      runtimeRef.current.events.complete();
      exit();
      return;
    }

    // File picker navigation
    if (state.fileMentionOpen) {
      if (key.escape) {
        dispatch({ type: 'file_mention_close' });
        return;
      }
      if (key.upArrow) {
        dispatch({ type: 'file_mention_navigate', direction: 'up' });
        return;
      }
      if (key.downArrow) {
        dispatch({ type: 'file_mention_navigate', direction: 'down' });
        return;
      }
      if (key.return) {
        const selected = state.filePickerResults[state.selectedFileIndex];
        if (selected) {
          const newText = inputText.replace(/(?:^|\s)@\S*$/, (m) =>
            m.replace(/@\S*$/, `@${selected}`),
          );
          setInputText(newText);
          dispatch({ type: 'file_mention_close' });
        }
        return;
      }
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
        dispatch({ type: 'slash_menu_close' });
        if (selected) {
          // For commands with arguments (e.g. "/job <url>"), route through handleSubmit
          if (inputText.includes(' ')) {
            handleSubmit(inputText);
          } else {
            executeSlashCommand(selected.name);
          }
        }
        return;
      }
      return;
    }
  }, [state.fileMentionOpen, state.filePickerResults, state.selectedFileIndex, state.slashMenuOpen, state.modelPickerOpen, state.slashFilter, state.selectedSlashIndex, state.selectedModelIndex, state.availableModels, inputText, onSwitchModel, switchRuntime, exit, handleSubmit]));

  const handleInputChange = useCallback((value: string) => {
    setInputText(value);

    // File mention detection
    const mentionFilter = getActiveMention(value);
    if (mentionFilter !== null) {
      if (!state.fileMentionOpen) {
        const files = listFiles(process.cwd());
        dispatch({ type: 'file_mention_open', allFiles: files, filter: mentionFilter });
      } else {
        dispatch({ type: 'file_mention_update_filter', filter: mentionFilter });
      }
      return;
    } else if (state.fileMentionOpen) {
      dispatch({ type: 'file_mention_close' });
    }

    // Slash menu detection
    if (value.startsWith('/') && !value.includes(' ')) {
      const filter = value.slice(1);
      if (!state.slashMenuOpen) {
        dispatch({ type: 'slash_menu_open', filter });
      } else {
        dispatch({ type: 'slash_menu_update_filter', filter });
      }
    } else if (state.slashMenuOpen) {
      dispatch({ type: 'slash_menu_close' });
    }
  }, [state.fileMentionOpen, state.slashMenuOpen]);

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
      {state.fileMentionOpen && (
        <FilePicker
          files={state.filePickerResults}
          selectedIndex={state.selectedFileIndex}
          filter={state.fileMentionFilter}
        />
      )}
      <InputBox
        disabled={state.streaming || state.modelPickerOpen}
        value={inputText}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
      />
      <UsageStats totals={state.usageTotals} />
    </Box>
  );
};
