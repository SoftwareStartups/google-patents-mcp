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
    expect(tool.definition.description).toContain('Fetches full patent content');
    expect(tool.definition.inputSchema.properties).toHaveProperty('patent_url');
    expect(tool.definition.inputSchema.properties).toHaveProperty('patent_id');
  });

  it('should call patentContentService.fetchContent with patent_url', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockContent = {
      content_included: true,
      claims: ['Claim 1', 'Claim 2'],
      description: 'Test description',
      full_text: 'Full patent text',
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
      'https://patents.google.com/patent/US1234567'
    );
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text as string;
    expect(JSON.parse(text)).toEqual(mockContent);
  });

  it('should call patentContentService.fetchContent with patent_id', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockContent = {
      content_included: true,
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

    const args = {
      patent_id: 'US1234567A',
    };

    const result = await tool.handler(args);

    expect(mockPatentContentService.fetchContent).toHaveBeenCalledWith(
      'US1234567A'
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
      content_included: true,
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
      'https://patents.google.com/patent/US1234567'
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

  it('should return content_included false when content not found', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockContent = {
      content_included: false,
    };

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
    const parsedContent = JSON.parse(text) as {
      content_included: boolean;
    };
    expect(parsedContent.content_included).toBe(false);
  });
});

