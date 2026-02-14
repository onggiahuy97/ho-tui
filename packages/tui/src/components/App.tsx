import React, { useReducer, useEffect, useCallback } from 'react';
import { Box, useApp, useInput } from 'ink';
import { AgentRuntime } from '@hotui/core';
import { TuiState, tuiReducer } from '../state';
import { StatusBar } from './StatusBar';
import { Transcript } from './Transcript';
import { InputBox } from './InputBox';

interface AppProps {
  runtime: AgentRuntime;
  initialState: TuiState;
}

export const App: React.FC<AppProps> = ({ runtime, initialState }) => {
  const [state, dispatch] = useReducer(tuiReducer, initialState);
  const { exit } = useApp();

  useEffect(() => {
    const subscription = runtime.events.subscribe();

    (async () => {
      for await (const event of subscription) {
        dispatch(event);
      }
    })();

    return () => {
      runtime.events.complete();
    };
  }, [runtime]);

  useInput(useCallback((_ch: string, key) => {
    if (key.ctrl && _ch === 'c') {
      runtime.events.complete();
      exit();
    }
  }, [runtime, exit]));

  const handleSubmit = useCallback((prompt: string) => {
    runtime.run(prompt).catch(() => {
      // Errors are published as runtime_error events on the event bus
    });
  }, [runtime]);

  return (
    <Box flexDirection="column">
      <StatusBar state={state} />
      <Transcript entries={state.transcript} />
      <InputBox disabled={state.streaming} onSubmit={handleSubmit} />
    </Box>
  );
};
