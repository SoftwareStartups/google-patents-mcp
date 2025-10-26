import { describe, expect, it } from 'vitest';
import { resolvePatentId } from '../../../src/utils/patent-id-resolver.js';

describe('resolvePatentId', () => {
  it('should extract patent ID from Google Patents URL', () => {
    const result = resolvePatentId(
      'https://patents.google.com/patent/US1234567A'
    );
    expect(result).toBe('patent/US1234567A/en');
  });

  it('should extract patent ID from URL with path components', () => {
    const result = resolvePatentId(
      'https://patents.google.com/patent/US1234567A/en'
    );
    expect(result).toBe('patent/US1234567A/en');
  });

  it('should handle patent ID already in correct format', () => {
    const result = resolvePatentId('patent/US1234567A/en');
    expect(result).toBe('patent/US1234567A/en');
  });

  it('should format plain patent ID', () => {
    const result = resolvePatentId('US1234567A');
    expect(result).toBe('patent/US1234567A/en');
  });

  it('should handle patent ID with patent/ prefix but no language', () => {
    const result = resolvePatentId('patent/US1234567A');
    expect(result).toBe('patent/US1234567A/en');
  });

  it('should handle various country codes', () => {
    expect(resolvePatentId('EP1234567A1')).toBe('patent/EP1234567A1/en');
    expect(resolvePatentId('WO2023123456')).toBe('patent/WO2023123456/en');
    expect(resolvePatentId('JP2023123456')).toBe('patent/JP2023123456/en');
  });
});
