import { ModelProvider } from './model-provider';
import { ProviderChatRequest, ProviderEvent } from './types';

export class OpenAIProvider implements ModelProvider {
  readonly id = 'openai';

  async *streamChat(_request: ProviderChatRequest): AsyncIterable<ProviderEvent> {
    throw new Error('OpenAIProvider is not implemented yet.');
  }
}
