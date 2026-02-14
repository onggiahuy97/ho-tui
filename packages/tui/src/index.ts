import React from 'react';
import { render } from 'ink';
import { AgentRuntime } from '@hotui/core';
import { App } from './components/App';
import { createInitialState, TuiState } from './state';

export { createInitialState, TuiState } from './state';
export type { TranscriptEntry, InitialStateOptions } from './state';

export interface RenderAppOptions {
  runtime: AgentRuntime;
  activeProvider: string;
  activeModel: string;
  sessionId: string;
  profileName: string;
}

export async function renderApp(options: RenderAppOptions): Promise<void> {
  const initialState: TuiState = createInitialState({
    activeProvider: options.activeProvider,
    activeModel: options.activeModel,
    sessionId: options.sessionId,
    profileName: options.profileName,
  });

  const { waitUntilExit } = render(
    React.createElement(App, { runtime: options.runtime, initialState }),
  );

  await waitUntilExit();
}
