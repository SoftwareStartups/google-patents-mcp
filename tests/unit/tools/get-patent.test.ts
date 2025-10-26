import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it, vi } from 'vitest';
import { createGetPatentTool } from '../../../src/tools/get-patent.js';

describe('get_patent Tool', () => {
  it('should have correct tool definition', () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentService = {
      fetchPatentData: vi.fn(),
    };

    const tool = createGetPatentTool(
      mockPatentService as never,
      mockLogger as never
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
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentData = {
      patent_id: 'US1234567',
      title: 'Test Patent',
      abstract: 'Test abstract',
    };

    const mockPatentService = {
      fetchPatentData: vi.fn().mockResolvedValue(mockPatentData),
    };

    const tool = createGetPatentTool(
      mockPatentService as never,
      mockLogger as never
    );

    const args = {
      patent_url: 'https://patents.google.com/patent/US1234567',
    };

    const result = await tool.handler(args);

    expect(mockPatentService.fetchPatentData).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      false, // includeClaims
      false, // includeDescription
      true, // includeAbstract
      false, // includeFamilyMembers
      false, // includeCitations
      true, // includeMetadata
      undefined // maxLength
    );
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text as string;
    expect(JSON.parse(text)).toEqual(mockPatentData);
  });

  it('should call patentService.fetchPatentData with patent_id and default include', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentData = {
      patent_id: 'US1234567',
      title: 'Test Patent',
    };

    const mockPatentService = {
      fetchPatentData: vi.fn().mockResolvedValue(mockPatentData),
    };

    const tool = createGetPatentTool(
      mockPatentService as never,
      mockLogger as never
    );

    const args = {
      patent_id: 'US1234567A',
    };

    const result = await tool.handler(args);

    expect(mockPatentService.fetchPatentData).toHaveBeenCalledWith(
      'US1234567A',
      false, // includeClaims
      false, // includeDescription
      true, // includeAbstract
      false, // includeFamilyMembers
      false, // includeCitations
      true, // includeMetadata
      undefined // maxLength
    );
    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text as string;
    expect(JSON.parse(text)).toEqual(mockPatentData);
  });

  it('should prefer patent_url over patent_id when both provided', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentData = {
      patent_id: 'US1234567',
      title: 'Test',
    };

    const mockPatentService = {
      fetchPatentData: vi.fn().mockResolvedValue(mockPatentData),
    };

    const tool = createGetPatentTool(
      mockPatentService as never,
      mockLogger as never
    );

    const args = {
      patent_url: 'https://patents.google.com/patent/US1234567',
      patent_id: 'US7654321',
    };

    await tool.handler(args);

    expect(mockPatentService.fetchPatentData).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      false, // includeClaims
      false, // includeDescription
      true, // includeAbstract
      false, // includeFamilyMembers
      false, // includeCitations
      true, // includeMetadata
      undefined // maxLength
    );
  });

  it('should throw error when neither patent_url nor patent_id provided', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentService = {
      fetchPatentData: vi.fn(),
    };

    const tool = createGetPatentTool(
      mockPatentService as never,
      mockLogger as never
    );

    const args = {};

    await expect(tool.handler(args)).rejects.toThrow();

    try {
      await tool.handler(args);
    } catch (error) {
      expect(error).toHaveProperty('code', ErrorCode.InvalidParams);
      expect(error).toHaveProperty('message');
      const errorMessage = (error as { message: string }).message;
      expect(errorMessage).toContain(
        'Either patent_url or patent_id must be provided'
      );
    }

    expect(mockPatentService.fetchPatentData).not.toHaveBeenCalled();
  });

  it('should handle errors from patentService', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentService = {
      fetchPatentData: vi.fn().mockRejectedValue(new Error('Fetch failed')),
    };

    const tool = createGetPatentTool(
      mockPatentService as never,
      mockLogger as never
    );

    await expect(
      tool.handler({ patent_url: 'https://patents.google.com/patent/US123' })
    ).rejects.toThrow('Fetch failed');

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in get_patent handler')
    );
  });

  it('should return empty object when content not found', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentData = {};

    const mockPatentService = {
      fetchPatentData: vi.fn().mockResolvedValue(mockPatentData),
    };

    const tool = createGetPatentTool(
      mockPatentService as never,
      mockLogger as never
    );

    const result = await tool.handler({
      patent_url: 'https://patents.google.com/patent/INVALID',
    });

    const text = result.content[0].text as string;
    const parsedData = JSON.parse(text) as Record<string, unknown>;
    expect(parsedData).toEqual({});
  });

  it('should include only claims when specified', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentData = {
      patent_id: 'US1234567',
      claims: ['Claim 1'],
    };

    const mockPatentService = {
      fetchPatentData: vi.fn().mockResolvedValue(mockPatentData),
    };

    const tool = createGetPatentTool(
      mockPatentService as never,
      mockLogger as never
    );

    await tool.handler({
      patent_url: 'https://patents.google.com/patent/US1234567',
      include: ['claims'],
    });

    expect(mockPatentService.fetchPatentData).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      true, // includeClaims
      false, // includeDescription
      false, // includeAbstract
      false, // includeFamilyMembers
      false, // includeCitations
      false, // includeMetadata
      undefined // maxLength
    );
  });

  it('should return only requested content based on include array', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentData = {
      patent_id: 'US1234567',
      description: 'Test description only',
    };

    const mockPatentService = {
      fetchPatentData: vi.fn().mockResolvedValue(mockPatentData),
    };

    const tool = createGetPatentTool(
      mockPatentService as never,
      mockLogger as never
    );

    const result = await tool.handler({
      patent_id: 'US1234567A',
      include: ['description'],
    });

    expect(mockPatentService.fetchPatentData).toHaveBeenCalledWith(
      'US1234567A',
      false, // includeClaims
      true, // includeDescription
      false, // includeAbstract
      false, // includeFamilyMembers
      false, // includeCitations
      false, // includeMetadata
      undefined // maxLength
    );

    const text = result.content[0].text as string;
    const parsedData = JSON.parse(text) as {
      description?: string;
      claims?: string[];
      family_members?: unknown[];
      citations?: unknown;
      patent_id?: string;
    };
    expect(parsedData).toEqual({
      patent_id: 'US1234567',
      description: 'Test description only',
    });
  });

  it('should pass max_length parameter to service', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentData = {
      patent_id: 'US1234567',
      abstract: 'Truncated abstract',
    };

    const mockPatentService = {
      fetchPatentData: vi.fn().mockResolvedValue(mockPatentData),
    };

    const tool = createGetPatentTool(
      mockPatentService as never,
      mockLogger as never
    );

    await tool.handler({
      patent_url: 'https://patents.google.com/patent/US1234567',
      max_length: 1000,
    });

    expect(mockPatentService.fetchPatentData).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      false, // includeClaims
      false, // includeDescription
      true, // includeAbstract
      false, // includeFamilyMembers
      false, // includeCitations
      true, // includeMetadata
      1000 // maxLength
    );
  });

  it('should handle max_length with selective content sections', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentData = {
      patent_id: 'US1234567',
      claims: ['Claim 1'],
    };

    const mockPatentService = {
      fetchPatentData: vi.fn().mockResolvedValue(mockPatentData),
    };

    const tool = createGetPatentTool(
      mockPatentService as never,
      mockLogger as never
    );

    await tool.handler({
      patent_id: 'US1234567A',
      include: ['claims'],
      max_length: 500,
    });

    expect(mockPatentService.fetchPatentData).toHaveBeenCalledWith(
      'US1234567A',
      true, // includeClaims
      false, // includeDescription
      false, // includeAbstract
      false, // includeFamilyMembers
      false, // includeCitations
      false, // includeMetadata
      500 // maxLength
    );
  });

  it('should handle empty include array by defaulting to metadata and abstract', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentData = {
      patent_id: 'US1234567',
      title: 'Test Patent',
      abstract: 'Test abstract',
    };

    const mockPatentService = {
      fetchPatentData: vi.fn().mockResolvedValue(mockPatentData),
    };

    const tool = createGetPatentTool(
      mockPatentService as never,
      mockLogger as never
    );

    await tool.handler({
      patent_url: 'https://patents.google.com/patent/US1234567',
      include: [],
    });

    expect(mockPatentService.fetchPatentData).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      false, // includeClaims
      false, // includeDescription
      true, // includeAbstract
      false, // includeFamilyMembers
      false, // includeCitations
      true, // includeMetadata
      undefined // maxLength
    );
  });

  it('should handle case-insensitive include values', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentData = {
      patent_id: 'US1234567',
      claims: ['Claim 1'],
      description: 'Test description',
    };

    const mockPatentService = {
      fetchPatentData: vi.fn().mockResolvedValue(mockPatentData),
    };

    const tool = createGetPatentTool(
      mockPatentService as never,
      mockLogger as never
    );

    await tool.handler({
      patent_url: 'https://patents.google.com/patent/US1234567',
      include: ['CLAIMS', 'Description'],
    });

    expect(mockPatentService.fetchPatentData).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      true, // includeClaims
      true, // includeDescription
      false, // includeAbstract
      false, // includeFamilyMembers
      false, // includeCitations
      false, // includeMetadata
      undefined // maxLength
    );
  });

  it('should throw error for invalid include value', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentService = {
      fetchPatentData: vi.fn(),
    };

    const tool = createGetPatentTool(
      mockPatentService as never,
      mockLogger as never
    );

    await expect(
      tool.handler({
        patent_url: 'https://patents.google.com/patent/US1234567',
        include: ['invalid_section'],
      })
    ).rejects.toThrow();

    try {
      await tool.handler({
        patent_url: 'https://patents.google.com/patent/US1234567',
        include: ['invalid_section'],
      });
    } catch (error) {
      expect(error).toHaveProperty('code', ErrorCode.InvalidParams);
      expect(error).toHaveProperty('message');
      const errorMessage = (error as { message: string }).message;
      expect(errorMessage).toContain('Invalid include value');
      expect(errorMessage).toContain('invalid_section');
    }

    expect(mockPatentService.fetchPatentData).not.toHaveBeenCalled();
  });

  it('should include only abstract when specified', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentData = {
      patent_id: 'US1234567',
      abstract: 'Test abstract only',
    };

    const mockPatentService = {
      fetchPatentData: vi.fn().mockResolvedValue(mockPatentData),
    };

    const tool = createGetPatentTool(
      mockPatentService as never,
      mockLogger as never
    );

    await tool.handler({
      patent_url: 'https://patents.google.com/patent/US1234567',
      include: ['abstract'],
    });

    expect(mockPatentService.fetchPatentData).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      false, // includeClaims
      false, // includeDescription
      true, // includeAbstract
      false, // includeFamilyMembers
      false, // includeCitations
      false, // includeMetadata
      undefined // maxLength
    );
  });

  it('should handle multiple include sections', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentData = {
      patent_id: 'US1234567',
      claims: ['Claim 1'],
      description: 'Test description',
      abstract: 'Test abstract',
      family_members: [
        { patent_id: 'EP1234567', region: 'EP', status: 'PENDING' },
      ],
      citations: { forward_citations: 10, backward_citations: 5 },
    };

    const mockPatentService = {
      fetchPatentData: vi.fn().mockResolvedValue(mockPatentData),
    };

    const tool = createGetPatentTool(
      mockPatentService as never,
      mockLogger as never
    );

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

    expect(mockPatentService.fetchPatentData).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      true, // includeClaims
      true, // includeDescription
      true, // includeAbstract
      true, // includeFamilyMembers
      true, // includeCitations
      true, // includeMetadata
      undefined // maxLength
    );
  });
});
