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

export type CoreEvent = ProviderEvent | UserMessageEvent | RuntimeErrorEvent;
