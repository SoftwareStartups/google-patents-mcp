import { describe, expect, it } from 'vitest';
import type { SerpApiPatentDetailsResponse } from '../../../src/types.js';
import {
  extractCitations,
  extractFamilyMembers,
} from '../../../src/utils/patent-data-extractor.js';

describe('extractFamilyMembers', () => {
  it('should extract family members from worldwide_applications', () => {
    const details: Partial<SerpApiPatentDetailsResponse> = {
      worldwide_applications: {
        '2023': [
          {
            application_number: 'US12/345,678',
            country_code: 'US',
            document_id: 'US1234567',
            filing_date: '2023-01-01',
            legal_status: 'Active',
            legal_status_cat: 'active',
            this_app: true,
          },
          {
            application_number: 'EP23/123456',
            country_code: 'EP',
            document_id: 'EP1234567',
            filing_date: '2023-01-15',
            legal_status: 'Pending',
            legal_status_cat: 'pending',
            this_app: false,
          },
          {
            application_number: 'JP2023-123456',
            country_code: 'JP',
            document_id: 'JP1234567',
            filing_date: '2023-02-01',
            legal_status: 'Granted',
            legal_status_cat: 'granted',
            this_app: false,
          },
        ],
      },
    };

    const result = extractFamilyMembers(
      details as SerpApiPatentDetailsResponse
    );

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      { patent_id: 'EP1234567', region: 'EP', status: 'Pending' },
      { patent_id: 'JP1234567', region: 'JP', status: 'Granted' },
    ]);
  });

  it('should skip applications marked as this_app', () => {
    const details: Partial<SerpApiPatentDetailsResponse> = {
      worldwide_applications: {
        '2023': [
          {
            application_number: 'US12/345,678',
            country_code: 'US',
            document_id: 'US1234567',
            filing_date: '2023-01-01',
            legal_status: 'Active',
            legal_status_cat: 'active',
            this_app: true,
          },
        ],
      },
    };

    const result = extractFamilyMembers(
      details as SerpApiPatentDetailsResponse
    );

    expect(result).toHaveLength(0);
  });

  it('should return empty array when worldwide_applications is missing', () => {
    const details: Partial<SerpApiPatentDetailsResponse> = {
      title: 'Test Patent',
    };

    const result = extractFamilyMembers(
      details as SerpApiPatentDetailsResponse
    );

    expect(result).toEqual([]);
  });

  it('should handle multiple years in worldwide_applications', () => {
    const details: Partial<SerpApiPatentDetailsResponse> = {
      worldwide_applications: {
        '2022': [
          {
            application_number: 'US12/345,678',
            country_code: 'US',
            document_id: 'US1234567',
            filing_date: '2022-01-01',
            legal_status: 'Active',
            legal_status_cat: 'active',
            this_app: false,
          },
        ],
        '2023': [
          {
            application_number: 'EP23/123456',
            country_code: 'EP',
            document_id: 'EP1234567',
            filing_date: '2023-01-15',
            legal_status: 'Pending',
            legal_status_cat: 'pending',
            this_app: false,
          },
        ],
      },
    };

    const result = extractFamilyMembers(
      details as SerpApiPatentDetailsResponse
    );

    expect(result).toHaveLength(2);
  });
});

describe('extractCitations', () => {
  it('should extract citation counts from SerpAPI response', () => {
    const details: Partial<SerpApiPatentDetailsResponse> = {
      patent_citations: {
        original: Array(10)
          .fill(null)
          .map((_, i) => ({
            publication_number: `US${i}`,
            title: `Patent ${i}`,
          })),
        family_to_family: Array(5).fill(null),
      },
      cited_by: {
        original: Array(3)
          .fill(null)
          .map((_, i) => ({
            publication_number: `CITED${i}`,
            title: `Citing Patent ${i}`,
          })),
      },
    };

    const result = extractCitations(details as SerpApiPatentDetailsResponse);

    expect(result).toEqual({
      forward_citations: 10,
      backward_citations: 3,
      family_to_family_citations: 5,
    });
  });

  it('should return undefined when no citations exist', () => {
    const details: Partial<SerpApiPatentDetailsResponse> = {
      title: 'Test Patent',
    };

    const result = extractCitations(details as SerpApiPatentDetailsResponse);

    expect(result).toBeUndefined();
  });

  it('should handle missing patent_citations', () => {
    const details: Partial<SerpApiPatentDetailsResponse> = {
      cited_by: {
        original: [
          {
            publication_number: 'US123',
            title: 'Citing Patent',
          },
        ],
      },
    };

    const result = extractCitations(details as SerpApiPatentDetailsResponse);

    expect(result).toEqual({
      forward_citations: 0,
      backward_citations: 1,
      family_to_family_citations: undefined,
    });
  });

  it('should handle missing cited_by', () => {
    const details: Partial<SerpApiPatentDetailsResponse> = {
      patent_citations: {
        original: [
          {
            publication_number: 'US123',
            title: 'Prior Art',
          },
        ],
      },
    };

    const result = extractCitations(details as SerpApiPatentDetailsResponse);

    expect(result).toEqual({
      forward_citations: 1,
      backward_citations: 0,
      family_to_family_citations: undefined,
    });
  });

  it('should handle empty citation arrays', () => {
    const details: Partial<SerpApiPatentDetailsResponse> = {
      patent_citations: {
        original: [],
      },
      cited_by: {
        original: [],
      },
    };

    const result = extractCitations(details as SerpApiPatentDetailsResponse);

    expect(result).toBeUndefined();
  });
});
