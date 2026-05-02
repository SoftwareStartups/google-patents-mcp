import { describe, expect, it, mock } from 'bun:test';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { createGetPatentTool } from '../../../src/tools/get-patent.js';
import {
  createMockLogger,
  createMockPatentService,
} from '../../helpers/test-utils.js';

const DEFAULT_INCLUDE = {
  includeClaims: false,
  includeDescription: false,
  includeAbstract: true,
  includeFamilyMembers: false,
  includeCitations: false,
  includeMetadata: true,
  maxLength: undefined,
};

const NONE_INCLUDE = {
  includeClaims: false,
  includeDescription: false,
  includeAbstract: false,
  includeFamilyMembers: false,
  includeCitations: false,
  includeMetadata: false,
  maxLength: undefined,
};

describe('get_patent Tool', () => {
  it('should have correct tool definition', () => {
    const tool = createGetPatentTool(
      createMockPatentService(),
      createMockLogger()
    );

    expect(tool.definition.name).toBe('get_patent');
    expect(tool.definition.description).toContain(
      'Fetches comprehensive patent data'
    );
    expect(tool.definition.inputSchema.properties).toHaveProperty('patent_url');
    expect(tool.definition.inputSchema.properties).toHaveProperty('patent_id');
    expect(tool.definition.inputSchema.properties).toHaveProperty('include');
  });

  it('should call patentService.fetchPatentData with patent_url and default include', async () => {
    const mockPatentData = {
      patent_id: 'US1234567',
      title: 'Test Patent',
      abstract: 'Test abstract',
    };
    const fetchPatentData = mock().mockResolvedValue(mockPatentData);
    const patentService = createMockPatentService({ fetchPatentData });
    const tool = createGetPatentTool(patentService, createMockLogger());

    const args = { patent_url: 'https://patents.google.com/patent/US1234567' };
    const result = await tool.handler(args);

    expect(fetchPatentData).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      DEFAULT_INCLUDE
    );
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(JSON.parse(text)).toEqual(mockPatentData);
  });

  it('should call patentService.fetchPatentData with patent_id and default include', async () => {
    const mockPatentData = { patent_id: 'US1234567', title: 'Test Patent' };
    const fetchPatentData = mock().mockResolvedValue(mockPatentData);
    const patentService = createMockPatentService({ fetchPatentData });
    const tool = createGetPatentTool(patentService, createMockLogger());

    const result = await tool.handler({ patent_id: 'US1234567A' });

    expect(fetchPatentData).toHaveBeenCalledWith('US1234567A', DEFAULT_INCLUDE);
    expect(result.content[0].type).toBe('text');
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(JSON.parse(text)).toEqual(mockPatentData);
  });

  it('should prefer patent_url over patent_id when both provided', async () => {
    const fetchPatentData = mock().mockResolvedValue({
      patent_id: 'US1234567',
      title: 'Test',
    });
    const patentService = createMockPatentService({ fetchPatentData });
    const tool = createGetPatentTool(patentService, createMockLogger());

    await tool.handler({
      patent_url: 'https://patents.google.com/patent/US1234567',
      patent_id: 'US7654321',
    });

    expect(fetchPatentData).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      expect.any(Object)
    );
  });

  it('should throw error when neither patent_url nor patent_id provided', async () => {
    const fetchPatentData = mock();
    const patentService = createMockPatentService({ fetchPatentData });
    const tool = createGetPatentTool(patentService, createMockLogger());

    await expect(tool.handler({})).rejects.toThrow();

    try {
      await tool.handler({});
    } catch (error) {
      expect(error).toHaveProperty('code', ErrorCode.InvalidParams);
      expect(error).toHaveProperty('message');
      const errorMessage = (error as { message: string }).message;
      expect(errorMessage).toContain(
        'Either patent_url or patent_id must be provided'
      );
    }

    expect(fetchPatentData).not.toHaveBeenCalled();
  });

  it('should handle errors from patentService', async () => {
    const logger = createMockLogger();
    const patentService = createMockPatentService({
      fetchPatentData: mock().mockRejectedValue(new Error('Fetch failed')),
    });
    const tool = createGetPatentTool(patentService, logger);

    await expect(
      tool.handler({ patent_url: 'https://patents.google.com/patent/US123' })
    ).rejects.toThrow('Fetch failed');

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in get_patent handler')
    );
  });

  it('should include only claims when specified', async () => {
    const fetchPatentData = mock().mockResolvedValue({
      patent_id: 'US1234567',
      claims: ['Claim 1'],
    });
    const patentService = createMockPatentService({ fetchPatentData });
    const tool = createGetPatentTool(patentService, createMockLogger());

    await tool.handler({
      patent_url: 'https://patents.google.com/patent/US1234567',
      include: ['claims'],
    });

    expect(fetchPatentData).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      { ...NONE_INCLUDE, includeClaims: true }
    );
  });

  it('should return only requested content based on include array', async () => {
    const mockPatentData = {
      patent_id: 'US1234567',
      description: 'Test description only',
    };
    const fetchPatentData = mock().mockResolvedValue(mockPatentData);
    const patentService = createMockPatentService({ fetchPatentData });
    const tool = createGetPatentTool(patentService, createMockLogger());

    const result = await tool.handler({
      patent_id: 'US1234567A',
      include: ['description'],
    });

    expect(fetchPatentData).toHaveBeenCalledWith('US1234567A', {
      ...NONE_INCLUDE,
      includeDescription: true,
    });

    const text = (result.content[0] as { type: 'text'; text: string }).text;
    const parsedData = JSON.parse(text) as {
      description?: string;
      patent_id?: string;
    };
    expect(parsedData).toEqual({
      patent_id: 'US1234567',
      description: 'Test description only',
    });
  });

  it('should pass max_length parameter to service', async () => {
    const fetchPatentData = mock().mockResolvedValue({
      patent_id: 'US1234567',
      abstract: 'Truncated abstract',
    });
    const patentService = createMockPatentService({ fetchPatentData });
    const tool = createGetPatentTool(patentService, createMockLogger());

    await tool.handler({
      patent_url: 'https://patents.google.com/patent/US1234567',
      max_length: 1000,
    });

    expect(fetchPatentData).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      { ...DEFAULT_INCLUDE, maxLength: 1000 }
    );
  });

  it('should handle max_length with selective content sections', async () => {
    const fetchPatentData = mock().mockResolvedValue({
      patent_id: 'US1234567',
      claims: ['Claim 1'],
    });
    const patentService = createMockPatentService({ fetchPatentData });
    const tool = createGetPatentTool(patentService, createMockLogger());

    await tool.handler({
      patent_id: 'US1234567A',
      include: ['claims'],
      max_length: 500,
    });

    expect(fetchPatentData).toHaveBeenCalledWith('US1234567A', {
      ...NONE_INCLUDE,
      includeClaims: true,
      maxLength: 500,
    });
  });

  it('should handle empty include array by defaulting to metadata and abstract', async () => {
    const fetchPatentData = mock().mockResolvedValue({
      patent_id: 'US1234567',
      title: 'Test Patent',
      abstract: 'Test abstract',
    });
    const patentService = createMockPatentService({ fetchPatentData });
    const tool = createGetPatentTool(patentService, createMockLogger());

    await tool.handler({
      patent_url: 'https://patents.google.com/patent/US1234567',
      include: [],
    });

    expect(fetchPatentData).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      DEFAULT_INCLUDE
    );
  });

  it('should handle case-insensitive include values', async () => {
    const fetchPatentData = mock().mockResolvedValue({
      patent_id: 'US1234567',
      claims: ['Claim 1'],
      description: 'Test description',
    });
    const patentService = createMockPatentService({ fetchPatentData });
    const tool = createGetPatentTool(patentService, createMockLogger());

    await tool.handler({
      patent_url: 'https://patents.google.com/patent/US1234567',
      include: ['CLAIMS', 'Description'],
    });

    expect(fetchPatentData).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      { ...NONE_INCLUDE, includeClaims: true, includeDescription: true }
    );
  });

  it('should throw error for invalid include value', async () => {
    const fetchPatentData = mock();
    const patentService = createMockPatentService({ fetchPatentData });
    const tool = createGetPatentTool(patentService, createMockLogger());

    const callWithInvalid = () =>
      tool.handler({
        patent_url: 'https://patents.google.com/patent/US1234567',
        include: ['invalid_section'],
      });

    await expect(callWithInvalid()).rejects.toThrow();

    try {
      await callWithInvalid();
    } catch (error) {
      expect(error).toHaveProperty('code', ErrorCode.InvalidParams);
      expect(error).toHaveProperty('message');
      const errorMessage = (error as { message: string }).message;
      expect(errorMessage).toContain('Invalid include value');
      expect(errorMessage).toContain('invalid_section');
    }

    expect(fetchPatentData).not.toHaveBeenCalled();
  });

  it('should include only abstract when specified', async () => {
    const fetchPatentData = mock().mockResolvedValue({
      patent_id: 'US1234567',
      abstract: 'Test abstract only',
    });
    const patentService = createMockPatentService({ fetchPatentData });
    const tool = createGetPatentTool(patentService, createMockLogger());

    await tool.handler({
      patent_url: 'https://patents.google.com/patent/US1234567',
      include: ['abstract'],
    });

    expect(fetchPatentData).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      { ...NONE_INCLUDE, includeAbstract: true }
    );
  });

  it('should handle multiple include sections', async () => {
    const fetchPatentData = mock().mockResolvedValue({
      patent_id: 'US1234567',
      claims: ['Claim 1'],
      description: 'Test description',
      abstract: 'Test abstract',
      family_members: [
        { patent_id: 'EP1234567', region: 'EP', status: 'PENDING' },
      ],
      citations: { forward_citations: 10, backward_citations: 5 },
    });
    const patentService = createMockPatentService({ fetchPatentData });
    const tool = createGetPatentTool(patentService, createMockLogger());

    await tool.handler({
      patent_url: 'https://patents.google.com/patent/US1234567',
      include: [
        'claims',
        'description',
        'abstract',
        'family_members',
        'citations',
        'metadata',
      ],
    });

    expect(fetchPatentData).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      {
        includeClaims: true,
        includeDescription: true,
        includeAbstract: true,
        includeFamilyMembers: true,
        includeCitations: true,
        includeMetadata: true,
        maxLength: undefined,
      }
    );
  });
});
