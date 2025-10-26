/**
 * Unit tests for Tool Handlers
 *
 * These tests validate tool handlers work correctly with mocked services.
 */

import { describe, expect, it, vi } from 'vitest';
import winston from 'winston';
import { PatentService } from '../../../src/services/patent.js';
import { SerpApiClient } from '../../../src/services/serpapi.js';
import { createGetPatentTool } from '../../../src/tools/get-patent.js';
import { createSearchPatentsTool } from '../../../src/tools/search-patents.js';
import type { PatentData, SerpApiResponse } from '../../../src/types.js';
import {
  assertValidPatentData,
  assertValidSearchResponse,
} from '../../helpers/assertions.js';
import { mockSearchResponse } from '../../helpers/test-data.js';
import { parseToolResponse } from '../../helpers/test-utils.js';

// Create a silent logger for tests
const logger = winston.createLogger({
  silent: true,
});

describe('Tool Handlers', () => {
  describe('Tool Definitions', () => {
    it('should have properly defined search_patents tool', () => {
      const searchPatentsMock = vi.fn();
      const mockSerpApiClient = {
        searchPatents: searchPatentsMock,
        getPatentDetails: vi.fn(),
      } as unknown as SerpApiClient;

      const tool = createSearchPatentsTool(mockSerpApiClient, logger);

      expect(tool.definition.name).toBe('search_patents');
      expect(tool.definition.description).toBeTruthy();
      expect(tool.definition.inputSchema).toBeDefined();
      expect(tool.definition.inputSchema.properties).toHaveProperty('q');
      expect(tool.definition.inputSchema.properties).toHaveProperty('num');
      expect(tool.definition.inputSchema.properties).toHaveProperty('assignee');
    });

    it('should have properly defined get_patent tool', () => {
      const fetchPatentDataMock = vi.fn();
      const mockPatentService = {
        fetchPatentData: fetchPatentDataMock,
      } as unknown as PatentService;

      const tool = createGetPatentTool(mockPatentService, logger);

      expect(tool.definition.name).toBe('get_patent');
      expect(tool.definition.description).toBeTruthy();
      expect(tool.definition.inputSchema).toBeDefined();
      expect(tool.definition.inputSchema.properties).toHaveProperty(
        'patent_url'
      );
      expect(tool.definition.inputSchema.properties).toHaveProperty(
        'patent_id'
      );
      expect(tool.definition.inputSchema.properties).toHaveProperty('include');
    });
  });

  describe('Search Patents Handler', () => {
    it('should search patents with query', async () => {
      const searchPatentsMock = vi.fn().mockResolvedValue(mockSearchResponse);
      const mockSerpApiClient = {
        searchPatents: searchPatentsMock,
      } as unknown as SerpApiClient;

      const tool = createSearchPatentsTool(mockSerpApiClient, logger);
      const response = await tool.handler({
        q: 'quantum computer',
        num: 10,
      });

      const data = parseToolResponse<SerpApiResponse>(response);
      assertValidSearchResponse(data);
      expect(data.organic_results).toBeDefined();
      expect(searchPatentsMock).toHaveBeenCalledWith({
        q: 'quantum computer',
        num: 10,
      });
    });

    it('should search with filters', async () => {
      const searchPatentsMock = vi.fn().mockResolvedValue(mockSearchResponse);
      const mockSerpApiClient = {
        searchPatents: searchPatentsMock,
      } as unknown as SerpApiClient;

      const tool = createSearchPatentsTool(mockSerpApiClient, logger);
      const response = await tool.handler({
        q: 'artificial intelligence',
        num: 10,
        country: 'US',
        status: 'GRANT',
      });

      const data = parseToolResponse<SerpApiResponse>(response);
      assertValidSearchResponse(data);
      expect(searchPatentsMock).toHaveBeenCalledWith({
        q: 'artificial intelligence',
        num: 10,
        country: 'US',
        status: 'GRANT',
      });
    });

    it('should handle pagination', async () => {
      const searchPatentsMock = vi.fn().mockResolvedValue(mockSearchResponse);
      const mockSerpApiClient = {
        searchPatents: searchPatentsMock,
      } as unknown as SerpApiClient;

      const tool = createSearchPatentsTool(mockSerpApiClient, logger);
      const response = await tool.handler({
        q: 'machine learning',
        num: 10,
        page: 2,
      });

      const data = parseToolResponse<SerpApiResponse>(response);
      assertValidSearchResponse(data);
      expect(searchPatentsMock).toHaveBeenCalledWith({
        q: 'machine learning',
        num: 10,
        page: 2,
      });
    });

    it('should search with assignee filter only', async () => {
      const searchPatentsMock = vi.fn().mockResolvedValue(mockSearchResponse);
      const mockSerpApiClient = {
        searchPatents: searchPatentsMock,
      } as unknown as SerpApiClient;

      const tool = createSearchPatentsTool(mockSerpApiClient, logger);
      const response = await tool.handler({
        assignee: 'Google',
        num: 10,
      });

      const data = parseToolResponse<SerpApiResponse>(response);
      assertValidSearchResponse(data);
      expect(searchPatentsMock).toHaveBeenCalledWith({
        assignee: 'Google',
        num: 10,
      });
    });

    it('should handle errors from SerpApiClient', async () => {
      const searchPatentsMock = vi
        .fn()
        .mockRejectedValue(new Error('API error'));
      const mockSerpApiClient = {
        searchPatents: searchPatentsMock,
      } as unknown as SerpApiClient;

      const tool = createSearchPatentsTool(mockSerpApiClient, logger);

      await expect(
        tool.handler({
          q: 'test query',
          num: 10,
        })
      ).rejects.toThrow('API error');
    });
  });

  describe('Get Patent Handler', () => {
    const mockPatentData: PatentData = {
      title: 'Test Patent',
      patent_number: 'US7654321B2',
      abstract: 'Test abstract',
      inventors: ['John Doe'],
      assignees: ['Test Corp'],
      filing_date: '2020-01-01',
      publication_date: '2021-01-01',
      grant_date: '2021-06-01',
      url: 'https://patents.google.com/patent/US7654321B2',
    };

    it('should fetch patent by URL', async () => {
      const fetchPatentDataMock = vi.fn().mockResolvedValue(mockPatentData);
      const mockPatentService = {
        fetchPatentData: fetchPatentDataMock,
      } as unknown as PatentService;

      const tool = createGetPatentTool(mockPatentService, logger);
      const response = await tool.handler({
        patent_url: 'https://patents.google.com/patent/US7654321B2',
      });

      const data = parseToolResponse<PatentData>(response);
      assertValidPatentData(data);

      expect(data.title).toBeDefined();
      expect(data.abstract).toBeDefined();
      expect(fetchPatentDataMock).toHaveBeenCalledWith(
        'https://patents.google.com/patent/US7654321B2',
        expect.objectContaining({
          includeMetadata: true,
          includeAbstract: true,
        })
      );
    });

    it('should fetch patent by ID', async () => {
      const fetchPatentDataMock = vi.fn().mockResolvedValue(mockPatentData);
      const mockPatentService = {
        fetchPatentData: fetchPatentDataMock,
      } as unknown as PatentService;

      const tool = createGetPatentTool(mockPatentService, logger);
      const response = await tool.handler({
        patent_id: 'US7654321B2',
      });

      const data = parseToolResponse<PatentData>(response);
      assertValidPatentData(data);
      expect(fetchPatentDataMock).toHaveBeenCalledWith(
        'US7654321B2',
        expect.objectContaining({
          includeMetadata: true,
          includeAbstract: true,
        })
      );
    });

    it('should fetch patent with specific sections', async () => {
      const fetchPatentDataMock = vi
        .fn()
        .mockResolvedValue({ ...mockPatentData, claims: ['Claim 1'] });
      const mockPatentService = {
        fetchPatentData: fetchPatentDataMock,
      } as unknown as PatentService;

      const tool = createGetPatentTool(mockPatentService, logger);
      const response = await tool.handler({
        patent_id: 'US7654321B2',
        include: ['claims', 'metadata'],
      });

      const data = parseToolResponse<PatentData>(response);
      assertValidPatentData(data);

      expect(data.claims).toBeDefined();
      expect(data.title).toBeDefined();
      expect(fetchPatentDataMock).toHaveBeenCalledWith(
        'US7654321B2',
        expect.objectContaining({
          includeClaims: true,
          includeMetadata: true,
          includeDescription: false,
          includeAbstract: false,
        })
      );
    });

    it('should fetch patent with all sections', async () => {
      const fullMockPatentData = {
        ...mockPatentData,
        claims: ['Claim 1'],
        description: 'Full description',
        family_members: [],
        citations: { cited_by: [], cites: [] },
      };

      const fetchPatentDataMock = vi.fn().mockResolvedValue(fullMockPatentData);
      const mockPatentService = {
        fetchPatentData: fetchPatentDataMock,
      } as unknown as PatentService;

      const tool = createGetPatentTool(mockPatentService, logger);
      const response = await tool.handler({
        patent_id: 'US7654321B2',
        include: [
          'metadata',
          'abstract',
          'claims',
          'description',
          'family_members',
          'citations',
        ],
      });

      const data = parseToolResponse<PatentData>(response);
      assertValidPatentData(data);
      expect(fetchPatentDataMock).toHaveBeenCalledWith(
        'US7654321B2',
        expect.objectContaining({
          includeMetadata: true,
          includeAbstract: true,
          includeClaims: true,
          includeDescription: true,
          includeFamilyMembers: true,
          includeCitations: true,
        })
      );
    });

    it('should handle max_length parameter', async () => {
      const fetchPatentDataMock = vi.fn().mockResolvedValue(mockPatentData);
      const mockPatentService = {
        fetchPatentData: fetchPatentDataMock,
      } as unknown as PatentService;

      const tool = createGetPatentTool(mockPatentService, logger);
      const response = await tool.handler({
        patent_id: 'US7654321B2',
        include: ['description'],
        max_length: 500,
      });

      const data = parseToolResponse<PatentData>(response);
      assertValidPatentData(data);
      expect(fetchPatentDataMock).toHaveBeenCalledWith(
        'US7654321B2',
        expect.objectContaining({
          maxLength: 500,
        })
      );
    });

    it('should throw error when neither patent_url nor patent_id provided', async () => {
      const fetchPatentDataMock = vi.fn();
      const mockPatentService = {
        fetchPatentData: fetchPatentDataMock,
      } as unknown as PatentService;

      const tool = createGetPatentTool(mockPatentService, logger);

      await expect(tool.handler({})).rejects.toThrow(
        'Either patent_url or patent_id must be provided'
      );
    });

    it('should handle errors from PatentService', async () => {
      const fetchPatentDataMock = vi
        .fn()
        .mockRejectedValue(new Error('Service error'));
      const mockPatentService = {
        fetchPatentData: fetchPatentDataMock,
      } as unknown as PatentService;

      const tool = createGetPatentTool(mockPatentService, logger);

      await expect(
        tool.handler({
          patent_id: 'US7654321B2',
        })
      ).rejects.toThrow('Service error');
    });

    it('should reject invalid include values', async () => {
      const fetchPatentDataMock = vi.fn();
      const mockPatentService = {
        fetchPatentData: fetchPatentDataMock,
      } as unknown as PatentService;

      const tool = createGetPatentTool(mockPatentService, logger);

      await expect(
        tool.handler({
          patent_id: 'US7654321B2',
          include: ['invalid_section'],
        })
      ).rejects.toThrow('Invalid include value');
    });
  });

  describe('Handler Workflow', () => {
    it('should search and then fetch patent content', async () => {
      // Mock services
      const searchPatentsMock = vi.fn().mockResolvedValue(mockSearchResponse);
      const mockSerpApiClient = {
        searchPatents: searchPatentsMock,
      } as unknown as SerpApiClient;

      const mockPatentData: PatentData = {
        title: 'Test Patent',
        patent_number: 'US7654321B2',
        abstract: 'Test abstract',
        inventors: ['John Doe'],
        assignees: ['Test Corp'],
        filing_date: '2020-01-01',
        publication_date: '2021-01-01',
        grant_date: '2021-06-01',
        url: 'https://patents.google.com/patent/US7654321B2',
      };

      const fetchPatentDataMock = vi.fn().mockResolvedValue(mockPatentData);
      const mockPatentService = {
        fetchPatentData: fetchPatentDataMock,
      } as unknown as PatentService;

      // Step 1: Search for patents
      const searchTool = createSearchPatentsTool(mockSerpApiClient, logger);
      const searchResponse = await searchTool.handler({
        q: 'neural network',
        num: 10,
      });

      const searchData = parseToolResponse<SerpApiResponse>(searchResponse);
      assertValidSearchResponse(searchData);
      expect(searchData.organic_results).toBeDefined();
      expect(searchData.organic_results!.length).toBeGreaterThan(0);

      // Step 2: Get content for first patent
      const firstPatent = searchData.organic_results![0];
      const patentArgs = firstPatent.patent_link
        ? { patent_url: firstPatent.patent_link }
        : { patent_id: firstPatent.patent_id };

      const getPatentTool = createGetPatentTool(mockPatentService, logger);
      const contentResponse = await getPatentTool.handler(patentArgs);

      const patentData = parseToolResponse<PatentData>(contentResponse);
      assertValidPatentData(patentData);
    });
  });
});
