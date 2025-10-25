import { describe, expect, it, vi } from 'vitest';
import { createSearchPatentsTool } from '../../../src/tools/search-patents.js';

describe('search_patents Tool', () => {
  it('should have correct tool definition', () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockSerpApiClient = {
      searchPatents: vi.fn(),
    };

    const tool = createSearchPatentsTool(
      mockSerpApiClient as never,
      mockLogger as never
    );

    expect(tool.definition.name).toBe('search_patents');
    expect(tool.definition.description).toContain('Searches Google Patents');
    expect(tool.definition.inputSchema.properties).toHaveProperty('q');
    expect(tool.definition.inputSchema.properties).toHaveProperty('page');
    expect(tool.definition.inputSchema.properties).toHaveProperty('num');
    expect(tool.definition.inputSchema.properties).toHaveProperty('sort');
    expect(tool.definition.inputSchema.properties).toHaveProperty('before');
    expect(tool.definition.inputSchema.properties).toHaveProperty('after');
    expect(tool.definition.inputSchema.properties).toHaveProperty('inventor');
    expect(tool.definition.inputSchema.properties).toHaveProperty('assignee');
    expect(tool.definition.inputSchema.properties).toHaveProperty('country');
    expect(tool.definition.inputSchema.properties).toHaveProperty('language');
    expect(tool.definition.inputSchema.properties).toHaveProperty('status');
    expect(tool.definition.inputSchema.properties).toHaveProperty('type');
    expect(tool.definition.inputSchema.properties).toHaveProperty('scholar');
  });

  it('should not have content-related parameters', () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockSerpApiClient = {
      searchPatents: vi.fn(),
    };

    const tool = createSearchPatentsTool(
      mockSerpApiClient as never,
      mockLogger as never
    );

    expect(tool.definition.inputSchema.properties).not.toHaveProperty(
      'include_full_content'
    );
    expect(tool.definition.inputSchema.properties).not.toHaveProperty(
      'include_claims'
    );
    expect(tool.definition.inputSchema.properties).not.toHaveProperty(
      'include_description'
    );
  });

  it('should call serpApiClient.searchPatents with provided args', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockResponse = {
      search_metadata: { status: 'Success' },
      organic_results: [
        {
          patent_id: 'US1234567',
          title: 'Test Patent',
        },
      ],
    };

    const mockSerpApiClient = {
      searchPatents: vi.fn().mockResolvedValue(mockResponse),
    };

    const tool = createSearchPatentsTool(
      mockSerpApiClient as never,
      mockLogger as never
    );

    const args = {
      q: 'quantum computer',
      num: 10,
      status: 'GRANT',
    };

    const result = await tool.handler(args);

    expect(mockSerpApiClient.searchPatents).toHaveBeenCalledWith(args);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text as string;
    expect(JSON.parse(text)).toEqual(mockResponse);
  });

  it('should handle errors from serpApiClient', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockSerpApiClient = {
      searchPatents: vi.fn().mockRejectedValue(new Error('API Error')),
    };

    const tool = createSearchPatentsTool(
      mockSerpApiClient as never,
      mockLogger as never
    );

    await expect(
      tool.handler({ q: 'test' })
    ).rejects.toThrow('API Error');

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in search_patents handler')
    );
  });

  it('should work with empty query and only filters', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockResponse = {
      organic_results: [
        {
          patent_id: 'FI127693B',
          assignee: 'Skyfora Oy',
        },
      ],
    };

    const mockSerpApiClient = {
      searchPatents: vi.fn().mockResolvedValue(mockResponse),
    };

    const tool = createSearchPatentsTool(
      mockSerpApiClient as never,
      mockLogger as never
    );

    const args = {
      assignee: 'Skyfora',
      num: 10,
    };

    const result = await tool.handler(args);

    expect(mockSerpApiClient.searchPatents).toHaveBeenCalledWith(args);
    expect(result.content[0].text).toContain('Skyfora Oy');
  });
});

