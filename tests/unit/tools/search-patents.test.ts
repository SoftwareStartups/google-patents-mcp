import { describe, expect, it, mock } from 'bun:test';
import { createSearchPatentsTool } from '../../../src/tools/search-patents.js';
import {
  createMockLogger,
  createMockSerpApiClient,
} from '../../helpers/test-utils.js';

describe('search_patents Tool', () => {
  it('should have correct tool definition', () => {
    const tool = createSearchPatentsTool(
      createMockSerpApiClient(),
      createMockLogger()
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

  it('should call serpApiClient.searchPatents with provided args', async () => {
    const mockResponse = {
      search_metadata: { status: 'Success' },
      organic_results: [{ patent_id: 'US1234567', title: 'Test Patent' }],
    };
    const searchPatents = mock().mockResolvedValue(mockResponse);
    const serpApi = createMockSerpApiClient({ searchPatents });
    const tool = createSearchPatentsTool(serpApi, createMockLogger());

    const args = { q: 'quantum computer', num: 10, status: 'GRANT' };
    const result = await tool.handler(args);

    expect(searchPatents).toHaveBeenCalledWith(args);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(JSON.parse(text)).toEqual(mockResponse);
  });

  it('should handle errors from serpApiClient', async () => {
    const logger = createMockLogger();
    const serpApi = createMockSerpApiClient({
      searchPatents: mock().mockRejectedValue(new Error('API Error')),
    });
    const tool = createSearchPatentsTool(serpApi, logger);

    await expect(tool.handler({ q: 'test' })).rejects.toThrow('API Error');
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in search_patents handler')
    );
  });

  it('should work with empty query and only filters', async () => {
    const mockResponse = {
      organic_results: [{ patent_id: 'FI127693B', assignee: 'Skyfora Oy' }],
    };
    const searchPatents = mock().mockResolvedValue(mockResponse);
    const serpApi = createMockSerpApiClient({ searchPatents });
    const tool = createSearchPatentsTool(serpApi, createMockLogger());

    const args = { assignee: 'Skyfora', num: 10 };
    const result = await tool.handler(args);

    expect(searchPatents).toHaveBeenCalledWith(args);
    expect(
      (result.content[0] as { type: 'text'; text: string }).text
    ).toContain('Skyfora Oy');
  });
});
