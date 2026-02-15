import Anthropic from '@anthropic-ai/sdk';
import { ModelProvider } from './model-provider';
import { ProviderChatRequest, ProviderEvent } from './types';

export class AnthropicProvider implements ModelProvider {
  readonly id = 'anthropic';
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is required. Set it in your .env file or environment variables.',
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  async *streamChat(request: ProviderChatRequest): AsyncIterable<ProviderEvent> {
    const { model, messages, temperature } = request;
    const provider = this.id;

    // Separate system messages from the rest — Anthropic uses a top-level `system` param
    const systemMessages = messages.filter((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const systemText = systemMessages.map((m) => m.content).join('\n\n') || undefined;

    const stream = this.client.messages.stream({
      model,
      max_tokens: 8192,
      system: systemText,
      messages: chatMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      ...(temperature != null ? { temperature } : {}),
    });

    let fullMessage = '';
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of stream) {
      const timestamp = new Date().toISOString();

      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        const token = event.delta.text;
        fullMessage += token;
        yield {
          type: 'assistant_token_delta',
          provider,
          model,
          token,
          timestamp,
        };
      }

      if (event.type === 'message_delta') {
        // Anthropic streams usage in message_delta
        if (event.usage?.output_tokens != null) {
          outputTokens = event.usage.output_tokens;
        }
      }

      if (event.type === 'message_start' && event.message?.usage) {
        inputTokens = event.message.usage.input_tokens;
      }
    }

    const timestamp = new Date().toISOString();

    yield {
      type: 'assistant_message_end',
      provider,
      model,
      message: fullMessage,
      timestamp,
    };

    yield {
      type: 'usage_update',
      provider,
      model,
      usage: {
        inputTokens,
        outputTokens,
      },
      timestamp,
    };
  }
}
