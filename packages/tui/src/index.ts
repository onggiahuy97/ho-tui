import React from 'react';
import { render } from 'ink';
import { AgentRuntime } from '@hotui/core';
import { App } from './components/App';
import { createInitialState, ModelOption, TuiState } from './state';

export { createInitialState, TuiState } from './state';
export type { TranscriptEntry, InitialStateOptions, ModelOption } from './state';

export interface RenderAppOptions {
  runtime: AgentRuntime;
  activeProvider: string;
  activeModel: string;
  sessionId: string;
  profileName: string;
  availableModels?: ModelOption[];
  onSwitchModel?: (profileName: string) => AgentRuntime | undefined;
}

export async function renderApp(options: RenderAppOptions): Promise<void> {
  const initialState: TuiState = createInitialState({
    activeProvider: options.activeProvider,
    activeModel: options.activeModel,
    sessionId: options.sessionId,
    profileName: options.profileName,
    availableModels: options.availableModels,
  });

  const { waitUntilExit } = render(
    React.createElement(App, {
      runtime: options.runtime,
      initialState,
      onSwitchModel: options.onSwitchModel,
    }),
  );

  await waitUntilExit();
}
