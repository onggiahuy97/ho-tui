import { describe, it, expect } from 'vitest';
import type { ModelProvider, ProviderChatRequest, ProviderEvent } from '@hotui/providers';
import { extractJobMetadata } from '../src/extractor';

/** A mock provider that returns a fixed JSON payload for extraction testing. */
function createJsonMockProvider(responseJson: Record<string, unknown>): ModelProvider {
  return {
    id: 'json-mock',
    async *streamChat(_request: ProviderChatRequest): AsyncIterable<ProviderEvent> {
      const message = JSON.stringify(responseJson);
      yield {
        type: 'assistant_message_end',
        provider: 'json-mock',
        model: 'test-model',
        message,
        timestamp: new Date().toISOString(),
      };
    },
  };
}

describe('extractJobMetadata', () => {
  it('should extract all fields from a valid LLM response', async () => {
    const mockResponse = {
      title: 'Senior Software Engineer',
      company: 'Acme Corp',
      location: 'San Francisco, CA (Remote)',
      description: 'We are looking for a senior engineer to join our team.',
      salary: '$150,000 - $200,000',
      externalJobId: 'JOB-12345',
      requirements: 'Bachelor\'s degree in CS, 5+ years experience',
      postedDate: '2026-03-01',
      applicationUrl: 'https://acme.com/apply/12345',
    };

    const provider = createJsonMockProvider(mockResponse);
    const result = await extractJobMetadata('Some job page text', provider, 'test-model');

    expect(result.title).toBe('Senior Software Engineer');
    expect(result.company).toBe('Acme Corp');
    expect(result.location).toBe('San Francisco, CA (Remote)');
    expect(result.description).toBe('We are looking for a senior engineer to join our team.');
    expect(result.salary).toBe('$150,000 - $200,000');
    expect(result.externalJobId).toBe('JOB-12345');
    expect(result.requirements).toBe("Bachelor's degree in CS, 5+ years experience");
    expect(result.postedDate).toBe('2026-03-01');
    expect(result.applicationUrl).toBe('https://acme.com/apply/12345');
  });

  it('should handle null fields gracefully', async () => {
    const mockResponse = {
      title: 'Backend Developer',
      company: null,
      location: null,
      description: 'A backend role.',
      salary: null,
      externalJobId: null,
      requirements: null,
      postedDate: null,
      applicationUrl: null,
    };

    const provider = createJsonMockProvider(mockResponse);
    const result = await extractJobMetadata('Some text', provider, 'test-model');

    expect(result.title).toBe('Backend Developer');
    expect(result.company).toBeNull();
    expect(result.salary).toBeNull();
  });

  it('should handle LLM response wrapped in markdown code fences', async () => {
    const inner = {
      title: 'DevOps Engineer',
      company: 'CloudCo',
      location: 'Remote',
      description: 'DevOps role.',
      salary: null,
      externalJobId: null,
      requirements: null,
      postedDate: null,
      applicationUrl: null,
    };

    // Simulate a provider that wraps JSON in code fences
    const provider: ModelProvider = {
      id: 'fenced-mock',
      async *streamChat(_request: ProviderChatRequest): AsyncIterable<ProviderEvent> {
        const message = '```json\n' + JSON.stringify(inner) + '\n```';
        yield {
          type: 'assistant_message_end',
          provider: 'fenced-mock',
          model: 'test-model',
          message,
          timestamp: new Date().toISOString(),
        };
      },
    };

    const result = await extractJobMetadata('Some text', provider, 'test-model');
    expect(result.title).toBe('DevOps Engineer');
    expect(result.company).toBe('CloudCo');
  });

  it('should throw on invalid JSON response', async () => {
    const provider: ModelProvider = {
      id: 'bad-mock',
      async *streamChat(_request: ProviderChatRequest): AsyncIterable<ProviderEvent> {
        yield {
          type: 'assistant_message_end',
          provider: 'bad-mock',
          model: 'test-model',
          message: 'This is not JSON at all',
          timestamp: new Date().toISOString(),
        };
      },
    };

    await expect(extractJobMetadata('text', provider, 'test-model')).rejects.toThrow(
      'Failed to parse LLM response as JSON',
    );
  });

  it('should throw on provider error event', async () => {
    const provider: ModelProvider = {
      id: 'error-mock',
      async *streamChat(_request: ProviderChatRequest): AsyncIterable<ProviderEvent> {
        yield {
          type: 'error',
          provider: 'error-mock',
          model: 'test-model',
          error: { message: 'Rate limit exceeded' },
          timestamp: new Date().toISOString(),
        };
      },
    };

    await expect(extractJobMetadata('text', provider, 'test-model')).rejects.toThrow(
      'Rate limit exceeded',
    );
  });
});
