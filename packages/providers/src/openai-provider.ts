import OpenAI from 'openai';
import { ModelProvider } from './model-provider';
import { ProviderChatRequest, ProviderEvent } from './types';

export class OpenAIProvider implements ModelProvider {
  readonly id = 'openai';
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is required. Set it in your .env file or environment variables.',
      );
    }
    this.client = new OpenAI({ apiKey });
  }

  async *streamChat(request: ProviderChatRequest): AsyncIterable<ProviderEvent> {
    const { model, messages, temperature } = request;
    const provider = this.id;

    const stream = await this.client.chat.completions.create({
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      stream_options: { include_usage: true },
      ...(temperature != null ? { temperature } : {}),
    });

    let fullMessage = '';
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of stream) {
      const timestamp = new Date().toISOString();
      const choice = chunk.choices?.[0];

      if (choice?.delta?.content) {
        const token = choice.delta.content;
        fullMessage += token;
        yield {
          type: 'assistant_token_delta',
          provider,
          model,
          token,
          timestamp,
        };
      }

      // OpenAI sends usage in the final chunk when stream_options.include_usage is true
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens;
        outputTokens = chunk.usage.completion_tokens;
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
