import React from 'react';
import { render } from 'ink';
import { AgentRuntime, SessionUsageTotals } from '@hotui/core';
import type { ModelProvider } from '@hotui/providers';
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
  onSwitchModel?: (profileName: string, usageTotals: SessionUsageTotals) => AgentRuntime | undefined;
  /** Provider instance for job parsing (optional; enables /job command). */
  jobParseProvider?: ModelProvider;
  /** Model to use for job parsing. */
  jobParseModel?: string;
  /** PostgreSQL connection string for job storage. */
  databaseUrl?: string;
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
      jobParseProvider: options.jobParseProvider,
      jobParseModel: options.jobParseModel,
      databaseUrl: options.databaseUrl,
    }),
  );

  await waitUntilExit();
}
