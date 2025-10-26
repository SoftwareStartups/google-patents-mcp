import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('PatentService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('Patent Data Fetching', () => {
    it('should fetch patent data with default options (metadata and abstract)', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockResolvedValue({
          title: 'Test Patent',
          publication_number: 'US1234567',
          assignees: ['Test Company'],
          inventors: [{ name: 'John Doe' }],
          priority_date: '2023-01-01',
          filing_date: '2023-02-01',
          publication_date: '2023-03-01',
          abstract: 'Test abstract',
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      const result = await service.fetchPatentData('US1234567');

      expect(mockSerpApiClient.getPatentDetails).toHaveBeenCalledWith(
        'patent/US1234567/en'
      );
      expect(result.patent_id).toBe('US1234567');
      expect(result.title).toBe('Test Patent');
      expect(result.abstract).toBe('Test abstract');
      expect(result.description).toBeUndefined();
      expect(result.publication_number).toBe('US1234567');
      expect(result.assignee).toBe('Test Company');
      expect(result.inventor).toBe('John Doe');
      expect(result.claims).toBeUndefined();
      expect(result.family_members).toBeUndefined();
      expect(result.citations).toBeUndefined();
    });

    it('should fetch patent data with claims included', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockResolvedValue({
          title: 'Test Patent',
          publication_number: 'US1234567',
          claims: [
            '1. A method for testing.',
            '2. The method of claim 1, wherein...',
          ],
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      const result = await service.fetchPatentData('patent/US1234567/en', {
        includeClaims: true,
        includeAbstract: false,
        includeMetadata: false,
      });

      expect(result.claims).toEqual([
        '1. A method for testing.',
        '2. The method of claim 1, wherein...',
      ]);
      expect(result.description).toBeUndefined();
      expect(result.abstract).toBeUndefined();
      expect(result.family_members).toBeUndefined();
      expect(result.citations).toBeUndefined();
    });

    it('should fetch patent data with abstract included separately', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockResolvedValue({
          title: 'Test Patent',
          publication_number: 'US1234567',
          abstract: 'This is a test abstract for the patent.',
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      const result = await service.fetchPatentData('patent/US1234567/en', {
        includeAbstract: true,
        includeMetadata: false,
      });

      expect(result.abstract).toBe('This is a test abstract for the patent.');
      expect(result.claims).toBeUndefined();
      expect(result.description).toBeUndefined();
      expect(result.title).toBeUndefined();
    });

    it('should extract family members from worldwide_applications', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockResolvedValue({
          title: 'Test Patent',
          publication_number: 'US1234567',
          worldwide_applications: {
            '2023': [
              {
                application_number: 'US12/456,789',
                country_code: 'US',
                document_id: 'patent/US1234567/en',
                filing_date: '2023-01-01',
                legal_status: 'Active',
                legal_status_cat: 'active',
                this_app: true,
              },
              {
                application_number: 'EP23/0123456',
                country_code: 'EP',
                document_id: 'patent/EP1234567/en',
                filing_date: '2023-01-15',
                legal_status: 'Pending',
                legal_status_cat: 'pending',
                this_app: false,
              },
              {
                application_number: 'JP2023-123456',
                country_code: 'JP',
                document_id: 'patent/JP1234567/en',
                filing_date: '2023-02-01',
                legal_status: 'Active',
                legal_status_cat: 'active',
                this_app: false,
              },
            ],
          },
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      const result = await service.fetchPatentData('patent/US1234567/en', {
        includeFamilyMembers: true,
        includeMetadata: false,
        includeAbstract: false,
      });

      expect(result.family_members).toEqual([
        { patent_id: 'patent/EP1234567/en', region: 'EP', status: 'Pending' },
        { patent_id: 'patent/JP1234567/en', region: 'JP', status: 'Active' },
      ]);
    });

    it('should extract citations from SerpAPI response', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockResolvedValue({
          title: 'Test Patent',
          publication_number: 'US1234567',
          patent_citations: {
            original: Array(47)
              .fill(null)
              .map((_, i) => ({
                publication_number: `US${i}`,
                title: `Patent ${i}`,
              })),
            family_to_family: Array(12).fill(null),
          },
          cited_by: {
            original: Array(8)
              .fill(null)
              .map((_, i) => ({
                publication_number: `CITED${i}`,
                title: `Cited Patent ${i}`,
              })),
          },
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      const result = await service.fetchPatentData('patent/US1234567/en', {
        includeCitations: true,
        includeMetadata: false,
        includeAbstract: false,
      });

      expect(result.citations).toEqual({
        forward_citations: 47,
        backward_citations: 8,
        family_to_family_citations: 12,
      });
    });

    it('should handle missing citations gracefully', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockResolvedValue({
          title: 'Test Patent',
          publication_number: 'US1234567',
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      const result = await service.fetchPatentData('patent/US1234567/en', {
        includeCitations: true,
        includeMetadata: false,
        includeAbstract: false,
      });

      expect(result.citations).toBeUndefined();
    });

    it('should handle missing family members gracefully', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockResolvedValue({
          title: 'Test Patent',
          publication_number: 'US1234567',
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      const result = await service.fetchPatentData('patent/US1234567/en', {
        includeFamilyMembers: true,
        includeMetadata: false,
        includeAbstract: false,
      });

      expect(result.family_members).toEqual([]);
    });
  });

  describe('Patent ID Resolution', () => {
    it('should extract patent ID from Google Patents URL', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockResolvedValue({
          title: 'Test Patent',
          publication_number: 'US1234567',
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      await service.fetchPatentData(
        'https://patents.google.com/patent/US1234567'
      );

      expect(mockSerpApiClient.getPatentDetails).toHaveBeenCalledWith(
        'patent/US1234567/en'
      );
    });

    it('should handle patent ID with path prefix', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockResolvedValue({
          title: 'Test Patent',
          publication_number: 'US1234567',
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      await service.fetchPatentData('patent/US1234567/en');

      expect(mockSerpApiClient.getPatentDetails).toHaveBeenCalledWith(
        'patent/US1234567/en'
      );
    });

    it('should pass through patent ID unchanged', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockResolvedValue({
          title: 'Test Patent',
          publication_number: 'US1234567',
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      await service.fetchPatentData('US1234567');

      expect(mockSerpApiClient.getPatentDetails).toHaveBeenCalledWith(
        'patent/US1234567/en'
      );
    });
  });

  describe('Content Truncation', () => {
    it('should handle description_link field correctly', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockResolvedValue({
          title: 'Test Patent',
          publication_number: 'US1234567',
          description_link: 'https://serpapi.com/test-description.html',
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      const result = await service.fetchPatentData('patent/US1234567/en', {
        includeDescription: false,
        includeMetadata: true,
        includeAbstract: false,
      });

      expect(result.title).toBe('Test Patent');
      expect(result.publication_number).toBe('US1234567');
    });

    it('should truncate claims array to complete claims only', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockResolvedValue({
          title: 'Test Patent',
          publication_number: 'US1234567',
          claims: [
            'First claim that is reasonably long',
            'Second claim that is also long',
            'Third claim',
            'Fourth claim',
          ],
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      const result = await service.fetchPatentData('patent/US1234567/en', {
        includeClaims: true,
        includeMetadata: false,
        includeAbstract: false,
        maxLength: 100,
      });

      expect(result.claims).toBeDefined();
      expect(result.claims!.length).toBeLessThanOrEqual(4);
      expect(result.claims!.length).toBeGreaterThan(0);
    });

    it('should not truncate when content is below max_length', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockResolvedValue({
          title: 'Test Patent',
          publication_number: 'US1234567',
          claims: ['Short text.'],
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      const result = await service.fetchPatentData('patent/US1234567/en', {
        includeClaims: true,
        includeMetadata: false,
        includeAbstract: false,
        maxLength: 1000,
      });

      expect(result.claims).toBeDefined();
      expect(result.claims).toContain('Short text.');
      expect(result.description).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when SerpAPI returns error', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockRejectedValue(new Error('SerpAPI error')),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      await expect(service.fetchPatentData('INVALID')).rejects.toThrow(
        'SerpAPI error'
      );
    });

    it('should throw error when SerpAPI returns empty response', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockResolvedValue({
          error:
            "Google Patents Details hasn't returned any results for this query.",
          search_metadata: {
            status: 'Success',
            results_state: 'Fully empty',
          },
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      await expect(service.fetchPatentData('FI20236453A1')).rejects.toThrow(
        "Google Patents Details hasn't returned any results for this query."
      );
    });

    it('should throw error for network errors', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockRejectedValue(new Error('Network error')),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      await expect(service.fetchPatentData('US1234567')).rejects.toThrow(
        'Network error'
      );
    });
  });
});
