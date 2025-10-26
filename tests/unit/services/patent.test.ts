import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('PatentService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('Patent Data Fetching', () => {
    it('should fetch patent data with default include (metadata and description)', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockResolvedValue({
          patent_id: 'US1234567',
          title: 'Test Patent',
          description: 'This is a test patent description.',
          publication_number: 'US1234567',
          assignee: 'Test Company',
          inventor: 'John Doe',
          priority_date: '2023-01-01',
          filing_date: '2023-02-01',
          grant_date: '2023-12-01',
          publication_date: '2023-03-01',
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
      expect(result.description).toBe('This is a test patent description.');
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
          patent_id: 'US1234567',
          title: 'Test Patent',
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

      const result = await service.fetchPatentData(
        'patent/US1234567/en',
        true,
        false,
        false,
        false,
        false
      );

      expect(result.claims).toEqual([
        '1. A method for testing.',
        '2. The method of claim 1, wherein...',
      ]);
      expect(result.description).toBeUndefined();
      expect(result.family_members).toBeUndefined();
      expect(result.citations).toBeUndefined();
    });

    it('should extract family members from country_status', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockResolvedValue({
          patent_id: 'US1234567',
          country_status: [
            {
              country: 'US',
              status: 'GRANTED',
              publication_number: 'US1234567',
            },
            {
              country: 'EP',
              status: 'PENDING',
              publication_number: 'EP1234567',
            },
            {
              country: 'JP',
              status: 'GRANTED',
              publication_number: 'JP1234567',
            },
          ],
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      const result = await service.fetchPatentData(
        'patent/US1234567/en',
        false,
        false,
        true,
        false,
        false
      );

      expect(result.family_members).toEqual([
        { patent_id: 'US1234567', region: 'US', status: 'GRANTED' },
        { patent_id: 'EP1234567', region: 'EP', status: 'PENDING' },
        { patent_id: 'JP1234567', region: 'JP', status: 'GRANTED' },
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
          patent_id: 'US1234567',
          citations: {
            forward_citations: 47,
            backward_citations: 8,
            family_to_family_citations: 12,
          },
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      const result = await service.fetchPatentData(
        'patent/US1234567/en',
        false,
        false,
        false,
        true,
        false
      );

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
          patent_id: 'US1234567',
          // No citations field
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      const result = await service.fetchPatentData(
        'patent/US1234567/en',
        false,
        false,
        false,
        true,
        false
      );

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
          patent_id: 'US1234567',
          // No country_status field
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      const result = await service.fetchPatentData(
        'patent/US1234567/en',
        false,
        false,
        true,
        false,
        false
      );

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
          patent_id: 'US1234567',
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
          patent_id: 'US1234567',
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
          patent_id: 'US1234567',
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
    it('should truncate description at paragraph boundary', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const longDescription =
        'First paragraph.\n\nSecond paragraph.\n\nThird paragraph that is very long and will be truncated.';
      const mockSerpApiClient = {
        getPatentDetails: vi.fn().mockResolvedValue({
          patent_id: 'US1234567',
          description: longDescription,
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      const result = await service.fetchPatentData(
        'patent/US1234567/en',
        false,
        true,
        false,
        false,
        false,
        50
      );

      expect(result.description).toBeDefined();
      expect(result.description).toContain('[Content truncated');
      // Check that it actually truncated the original content
      const originalTextBeforeIndicator = result
        .description!.split('[Content truncated')[0]
        .trim();
      expect(originalTextBeforeIndicator.length).toBeLessThan(
        longDescription.length
      );
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
          patent_id: 'US1234567',
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

      const result = await service.fetchPatentData(
        'patent/US1234567/en',
        true,
        false,
        false,
        false,
        false,
        100
      );

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
          patent_id: 'US1234567',
          description: 'Short text.',
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      const result = await service.fetchPatentData(
        'patent/US1234567/en',
        false,
        true,
        false,
        false,
        false,
        1000
      );

      expect(result.description).toBeDefined();
      expect(result.description).not.toContain('[Content truncated');
      expect(result.description).toContain('Short text');
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

      await expect(service.fetchPatentData('INVALID')).rejects.toThrow('SerpAPI error');
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
          error: 'Google Patents Details hasn\'t returned any results for this query.',
          search_metadata: {
            status: 'Success',
            results_state: 'Fully empty'
          }
        }),
      };

      const { PatentService } = await import('../../../src/services/patent.js');
      const service = new PatentService(
        mockSerpApiClient as never,
        mockLogger as never
      );

      await expect(service.fetchPatentData('FI20236453A1')).rejects.toThrow(
        'Google Patents Details hasn\'t returned any results for this query.'
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

      await expect(service.fetchPatentData('US1234567')).rejects.toThrow('Network error');
    });
  });
});
