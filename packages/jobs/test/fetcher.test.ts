import { describe, it, expect } from 'vitest';
import { fetchJobPage } from '../src/fetcher';

describe('fetchJobPage', () => {
  it('should reject invalid URL protocols', async () => {
    await expect(fetchJobPage('ftp://example.com')).rejects.toThrow('Unsupported protocol');
  });

  it('should reject malformed URLs', async () => {
    await expect(fetchJobPage('not-a-url')).rejects.toThrow();
  });

  it('should accept http:// URLs', async () => {
    // This will fail with a network error in tests (no real server), but validates URL parsing
    try {
      await fetchJobPage('http://localhost:99999/nonexistent');
    } catch (error) {
      // Expected: network error, NOT a URL validation error
      expect((error as Error).message).not.toContain('Unsupported protocol');
    }
  });

  it('should accept https:// URLs', async () => {
    try {
      await fetchJobPage('https://localhost:99999/nonexistent');
    } catch (error) {
      expect((error as Error).message).not.toContain('Unsupported protocol');
    }
  });
});
