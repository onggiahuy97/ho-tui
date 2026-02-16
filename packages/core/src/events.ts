import { ProviderEvent } from '@hotui/providers';

export interface UserMessageEvent {
  type: 'user_message';
  id: string;
  content: string;
  timestamp: string;
}

export interface RuntimeErrorEvent {
  type: 'runtime_error';
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
}

export interface SessionUsageTotals {
  inputTokens: number;
  outputTokens: number;
  turns: number;
  cost?: number;
}

export interface SessionUsageEvent {
  type: 'session_usage';
  timestamp: string;
  totals: SessionUsageTotals;
}

export type CoreEvent =
  | ProviderEvent
  | UserMessageEvent
  | RuntimeErrorEvent
  | SessionUsageEvent;
