import { ProviderChatRequest, ProviderEvent } from './types';

export interface ModelProvider {
  readonly id: string;
  streamChat(request: ProviderChatRequest): AsyncIterable<ProviderEvent>;
}
