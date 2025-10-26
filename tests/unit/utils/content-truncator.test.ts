import { describe, expect, it } from 'vitest';
import {
  truncateClaims,
  truncateText,
} from '../../../src/utils/content-truncator.js';

describe('truncateText', () => {
  it('should not truncate text shorter than maxLength', () => {
    const text = 'Short text';
    const result = truncateText(text, 100);
    expect(result).toBe(text);
  });

  it('should truncate at paragraph boundary', () => {
    const text = 'First paragraph.\n\nSecond paragraph that is very long.';
    const result = truncateText(text, 20);
    expect(result).toContain('First paragraph.');
    expect(result).toContain('[Content truncated');
  });

  it('should truncate at newline boundary if no paragraph break', () => {
    const text = 'First line\nSecond line that is very long';
    const result = truncateText(text, 15);
    expect(result).toContain('First line');
    expect(result).toContain('[Content truncated');
  });

  it('should truncate at word boundary if no newline', () => {
    const text = 'This is a very long sentence without any newlines';
    const result = truncateText(text, 20);
    expect(result).not.toContain('sentence');
    expect(result).toContain('[Content truncated');
  });

  it('should hard truncate if no good boundary found', () => {
    const text = 'ThisIsAVeryLongWordWithoutAnySpaces';
    const result = truncateText(text, 15);
    expect(result.length).toBeLessThan(text.length + 100); // Account for indicator
    expect(result).toContain('[Content truncated');
  });

  it('should include character count in truncation indicator', () => {
    const text =
      'This is some text that needs to be truncated for testing purposes';
    const result = truncateText(text, 20);
    expect(result).toMatch(
      /\[Content truncated - \d+ of \d+ characters shown\]/
    );
  });
});

describe('truncateClaims', () => {
  it('should not truncate if all claims fit', () => {
    const claims = ['Claim 1', 'Claim 2', 'Claim 3'];
    const result = truncateClaims(claims, 1000);
    expect(result).toEqual(claims);
  });

  it('should truncate to complete claims only', () => {
    const claims = [
      'Short claim 1',
      'Short claim 2',
      'This is a very long claim that will not fit',
    ];
    const result = truncateClaims(claims, 30);
    expect(result.length).toBeLessThan(claims.length);
    expect(result).toContain('Short claim 1');
  });

  it('should return empty array if first claim is too long', () => {
    const claims = ['This is a very long claim that exceeds the limit'];
    const result = truncateClaims(claims, 10);
    expect(result).toEqual([]);
  });

  it('should account for newlines between claims', () => {
    const claims = ['A', 'B', 'C', 'D'];
    // Each claim is 1 char + 2 for newlines = 3 total per claim
    const result = truncateClaims(claims, 10); // Should fit 3 claims (9 total)
    expect(result.length).toBe(3);
    expect(result).toEqual(['A', 'B', 'C']);
  });
});
