import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it, vi } from 'vitest';
import { createGetPatentContentTool } from '../../../src/tools/get-patent-content.js';

describe('get_patent_content Tool', () => {
  it('should have correct tool definition', () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentContentService = {
      fetchContent: vi.fn(),
    };

    const tool = createGetPatentContentTool(
      mockPatentContentService as never,
      mockLogger as never
    );

    expect(tool.definition.name).toBe('get_patent_content');
    expect(tool.definition.description).toContain(
      'Fetches full patent content'
    );
    expect(tool.definition.inputSchema.properties).toHaveProperty('patent_url');
    expect(tool.definition.inputSchema.properties).toHaveProperty('patent_id');
  });

  it('should call patentContentService.fetchContent with patent_url and default include', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockContent = {
      description: 'Test description',
    };

    const mockPatentContentService = {
      fetchContent: vi.fn().mockResolvedValue(mockContent),
    };

    const tool = createGetPatentContentTool(
      mockPatentContentService as never,
      mockLogger as never
    );

    const args = {
      patent_url: 'https://patents.google.com/patent/US1234567',
    };

    const result = await tool.handler(args);

    expect(mockPatentContentService.fetchContent).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      false,
      true,
      false,
      undefined
    );
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text as string;
    expect(JSON.parse(text)).toEqual(mockContent);
  });

  it('should call patentContentService.fetchContent with patent_id and default include', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockContent = {
      description: 'Test description',
    };

    const mockPatentContentService = {
      fetchContent: vi.fn().mockResolvedValue(mockContent),
    };

    const tool = createGetPatentContentTool(
      mockPatentContentService as never,
      mockLogger as never
    );

    const args = {
      patent_id: 'US1234567A',
    };

    const result = await tool.handler(args);

    expect(mockPatentContentService.fetchContent).toHaveBeenCalledWith(
      'US1234567A',
      false,
      true,
      false,
      undefined
    );
    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text as string;
    expect(JSON.parse(text)).toEqual(mockContent);
  });

  it('should prefer patent_url over patent_id when both provided', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockContent = {
      description: 'Test',
    };

    const mockPatentContentService = {
      fetchContent: vi.fn().mockResolvedValue(mockContent),
    };

    const tool = createGetPatentContentTool(
      mockPatentContentService as never,
      mockLogger as never
    );

    const args = {
      patent_url: 'https://patents.google.com/patent/US1234567',
      patent_id: 'US7654321',
    };

    await tool.handler(args);

    expect(mockPatentContentService.fetchContent).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      false,
      true,
      false,
      undefined
    );
  });

  it('should throw error when neither patent_url nor patent_id provided', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentContentService = {
      fetchContent: vi.fn(),
    };

    const tool = createGetPatentContentTool(
      mockPatentContentService as never,
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

    expect(mockPatentContentService.fetchContent).not.toHaveBeenCalled();
  });

  it('should handle errors from patentContentService', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentContentService = {
      fetchContent: vi.fn().mockRejectedValue(new Error('Fetch failed')),
    };

    const tool = createGetPatentContentTool(
      mockPatentContentService as never,
      mockLogger as never
    );

    await expect(
      tool.handler({ patent_url: 'https://patents.google.com/patent/US123' })
    ).rejects.toThrow('Fetch failed');

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in get_patent_content handler')
    );
  });

  it('should return empty object when content not found', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockContent = {};

    const mockPatentContentService = {
      fetchContent: vi.fn().mockResolvedValue(mockContent),
    };

    const tool = createGetPatentContentTool(
      mockPatentContentService as never,
      mockLogger as never
    );

    const result = await tool.handler({
      patent_url: 'https://patents.google.com/patent/INVALID',
    });

    const text = result.content[0].text as string;
    const parsedContent = JSON.parse(text) as Record<string, unknown>;
    expect(parsedContent).toEqual({});
  });

  it('should use description as default when include not provided', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockContent = {
      description: 'Test description',
    };

    const mockPatentContentService = {
      fetchContent: vi.fn().mockResolvedValue(mockContent),
    };

    const tool = createGetPatentContentTool(
      mockPatentContentService as never,
      mockLogger as never
    );

    await tool.handler({
      patent_url: 'https://patents.google.com/patent/US1234567',
    });

    expect(mockPatentContentService.fetchContent).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      false,
      true,
      false,
      undefined
    );
  });

  it('should include only claims when specified', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockContent = {
      claims: ['Claim 1'],
    };

    const mockPatentContentService = {
      fetchContent: vi.fn().mockResolvedValue(mockContent),
    };

    const tool = createGetPatentContentTool(
      mockPatentContentService as never,
      mockLogger as never
    );

    await tool.handler({
      patent_url: 'https://patents.google.com/patent/US1234567',
      include: ['claims'],
    });

    expect(mockPatentContentService.fetchContent).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      true,
      false,
      false,
      undefined
    );
  });

  it('should return only requested content based on include array', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockContent = {
      description: 'Test description only',
    };

    const mockPatentContentService = {
      fetchContent: vi.fn().mockResolvedValue(mockContent),
    };

    const tool = createGetPatentContentTool(
      mockPatentContentService as never,
      mockLogger as never
    );

    const result = await tool.handler({
      patent_id: 'US1234567A',
      include: ['description'],
    });

    expect(mockPatentContentService.fetchContent).toHaveBeenCalledWith(
      'US1234567A',
      false,
      true,
      false,
      undefined
    );

    const text = result.content[0].text as string;
    const parsedContent = JSON.parse(text) as {
      description?: string;
      claims?: string[];
      full_text?: string;
    };
    expect(parsedContent).toEqual({ description: 'Test description only' });
    expect(parsedContent.claims).toBeUndefined();
    expect(parsedContent.full_text).toBeUndefined();
  });

  it('should pass max_length parameter to service', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockContent = {
      description: 'Truncated description',
    };

    const mockPatentContentService = {
      fetchContent: vi.fn().mockResolvedValue(mockContent),
    };

    const tool = createGetPatentContentTool(
      mockPatentContentService as never,
      mockLogger as never
    );

    await tool.handler({
      patent_url: 'https://patents.google.com/patent/US1234567',
      max_length: 1000,
    });

    expect(mockPatentContentService.fetchContent).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      false,
      true,
      false,
      1000
    );
  });

  it('should handle max_length with selective content sections', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockContent = {
      claims: ['Claim 1'],
    };

    const mockPatentContentService = {
      fetchContent: vi.fn().mockResolvedValue(mockContent),
    };

    const tool = createGetPatentContentTool(
      mockPatentContentService as never,
      mockLogger as never
    );

    await tool.handler({
      patent_id: 'US1234567A',
      include: ['claims'],
      max_length: 500,
    });

    expect(mockPatentContentService.fetchContent).toHaveBeenCalledWith(
      'US1234567A',
      true,
      false,
      false,
      500
    );
  });

  it('should return truncated content when max_length is applied', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockContent = {
      description:
        'Short description\n\n[Content truncated - 50 of 10000 characters shown]',
    };

    const mockPatentContentService = {
      fetchContent: vi.fn().mockResolvedValue(mockContent),
    };

    const tool = createGetPatentContentTool(
      mockPatentContentService as never,
      mockLogger as never
    );

    const result = await tool.handler({
      patent_id: 'US1234567A',
      include: ['description'],
      max_length: 100,
    });

    const text = result.content[0].text as string;
    const parsedContent = JSON.parse(text) as { description?: string };
    expect(parsedContent.description).toContain('[Content truncated');
  });

  it('should handle empty include array by defaulting to description', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockContent = {
      description: 'Test description',
    };

    const mockPatentContentService = {
      fetchContent: vi.fn().mockResolvedValue(mockContent),
    };

    const tool = createGetPatentContentTool(
      mockPatentContentService as never,
      mockLogger as never
    );

    await tool.handler({
      patent_url: 'https://patents.google.com/patent/US1234567',
      include: [],
    });

    expect(mockPatentContentService.fetchContent).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      false,
      true,
      false,
      undefined
    );
  });

  it('should handle case-insensitive include values', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockContent = {
      claims: ['Claim 1'],
      description: 'Test description',
    };

    const mockPatentContentService = {
      fetchContent: vi.fn().mockResolvedValue(mockContent),
    };

    const tool = createGetPatentContentTool(
      mockPatentContentService as never,
      mockLogger as never
    );

    await tool.handler({
      patent_url: 'https://patents.google.com/patent/US1234567',
      include: ['CLAIMS', 'Description'],
    });

    expect(mockPatentContentService.fetchContent).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      true,
      true,
      false,
      undefined
    );
  });

  it('should throw error for invalid include value', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockPatentContentService = {
      fetchContent: vi.fn(),
    };

    const tool = createGetPatentContentTool(
      mockPatentContentService as never,
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

    expect(mockPatentContentService.fetchContent).not.toHaveBeenCalled();
  });

  it('should handle multiple include sections', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockContent = {
      claims: ['Claim 1'],
      description: 'Test description',
      full_text: 'Full text',
    };

    const mockPatentContentService = {
      fetchContent: vi.fn().mockResolvedValue(mockContent),
    };

    const tool = createGetPatentContentTool(
      mockPatentContentService as never,
      mockLogger as never
    );

    await tool.handler({
      patent_url: 'https://patents.google.com/patent/US1234567',
      include: ['claims', 'description', 'full_text'],
    });

    expect(mockPatentContentService.fetchContent).toHaveBeenCalledWith(
      'https://patents.google.com/patent/US1234567',
      true,
      true,
      true,
      undefined
    );
  });
});
