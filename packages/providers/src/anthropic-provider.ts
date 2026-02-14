import { ModelProvider } from './model-provider';
import { ProviderChatRequest, ProviderEvent } from './types';

export class AnthropicProvider implements ModelProvider {
  readonly id = 'anthropic';

  async *streamChat(_request: ProviderChatRequest): AsyncIterable<ProviderEvent> {
    throw new Error('AnthropicProvider is not implemented yet.');
  }
}
