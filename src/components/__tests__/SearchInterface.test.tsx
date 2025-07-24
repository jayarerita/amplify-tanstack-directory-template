import { describe, it, expect } from 'vitest';

// Simple test to verify the search interface module can be imported
describe('SearchInterface', () => {
  it('should be importable', async () => {
    const { SearchInterface } = await import('../SearchInterface');
    expect(SearchInterface).toBeDefined();
    expect(typeof SearchInterface).toBe('function');
  });
});