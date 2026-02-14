import { ModelProvider } from './model-provider';
import { ProviderChatMessage, ProviderChatRequest, ProviderEvent } from './types';

export class MockProvider implements ModelProvider {
  readonly id = 'mock';

  async *streamChat(request: ProviderChatRequest): AsyncIterable<ProviderEvent> {
    const model = request.model;
    const provider = this.id;
    const message = this.buildResponse(request.messages);
    const tokens = this.tokenize(message);

    for (const token of tokens) {
      yield {
        type: 'assistant_token_delta',
        provider,
        model,
        token,
        timestamp: new Date().toISOString(),
      };
      await this.sleep(5);
    }

    yield {
      type: 'assistant_message_end',
      provider,
      model,
      message,
      timestamp: new Date().toISOString(),
    };

    yield {
      type: 'usage_update',
      provider,
      model,
      usage: {
        inputTokens: this.estimateTokens(request.messages),
        outputTokens: tokens.length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private buildResponse(messages: ProviderChatMessage[]): string {
    const lastUser = [...messages].reverse().find((msg) => msg.role === 'user');
    if (!lastUser) {
      return 'Mock provider is ready.';
    }

    return `Mock response to: ${lastUser.content}`;
  }

  private tokenize(text: string): string[] {
    return text.split(/(\s+)/).filter((segment) => segment.length > 0);
  }

  private estimateTokens(messages: ProviderChatMessage[]): number {
    return messages.reduce((total, message) => total + this.tokenize(message.content).length, 0);
  }

  private sleep(durationMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, durationMs));
  }
}
