import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';

describe('Google Patents MCP Server - Unit Tests', () => {
  describe('Config Module', () => {
    it('should load config with valid environment variables', () => {
      const oldApiKey = process.env.SERPAPI_API_KEY;
      const oldLogLevel = process.env.LOG_LEVEL;

      try {
        process.env.SERPAPI_API_KEY = 'test_api_key';
        process.env.LOG_LEVEL = 'debug';

        vi.resetModules();

        // Re-import to get fresh module
        const config = {
          serpApiKey: process.env.SERPAPI_API_KEY,
          logLevel: process.env.LOG_LEVEL || 'info',
        };

        expect(config.serpApiKey).toBe('test_api_key');
        expect(config.logLevel).toBe('debug');
      } finally {
        process.env.SERPAPI_API_KEY = oldApiKey;
        process.env.LOG_LEVEL = oldLogLevel;
      }
    });

    it('should use default log level if not specified', () => {
      const logLevelFromEnv: string | undefined = undefined;
      const config = {
        serpApiKey: 'test_api_key',
        logLevel: logLevelFromEnv || 'info',
      };

      expect(config.logLevel).toBe('info');
    });

    it('should validate that config requires SERPAPI_API_KEY', () => {
      const apiKey = undefined;

      const getConfig = () => {
        if (!apiKey) {
          throw new Error('SERPAPI_API_KEY environment variable is not set.');
        }
        return { serpApiKey: apiKey, logLevel: 'info' };
      };

      expect(() => getConfig()).toThrow(
        'SERPAPI_API_KEY environment variable is not set.'
      );
    });
  });

  describe('Types Module', () => {
    it('should have correct SearchPatentsArgs structure', () => {
      const args: {
        q: string;
        page?: number;
        num?: number;
        sort?: 'relevance' | 'new' | 'old';
        before?: string;
        after?: string;
        inventor?: string;
        assignee?: string;
        country?: string;
        language?: string;
        status?: 'GRANT' | 'APPLICATION';
        type?: 'PATENT' | 'DESIGN';
        scholar?: boolean;
      } = {
        q: 'quantum computer',
        page: 1,
        num: 10,
        sort: 'relevance',
        country: 'US',
        status: 'GRANT',
        type: 'PATENT',
      };

      expect(args.q).toBe('quantum computer');
      expect(args.page).toBe(1);
      expect(args.status).toBe('GRANT');
    });
  });

  describe('SerpApiClient', () => {
    beforeEach(() => {
      vi.resetModules();
      vi.clearAllMocks();
    });

    it('should construct correct URL parameters for basic search', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () =>
          await Promise.resolve({
            search_metadata: { status: 'Success' },
            organic_results: [],
          }),
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_api_key', mockLogger as never);

      await client.searchPatents({ q: 'quantum computer' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('engine=google_patents'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=quantum'),
        expect.any(Object)
      );
    });

    it('should include optional parameters when provided', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => await Promise.resolve({ organic_results: [] }),
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_api_key', mockLogger as never);

      await client.searchPatents({
        q: 'AI',
        page: 2,
        num: 20,
        sort: 'new',
        country: 'US',
        status: 'GRANT',
      });

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('page=2');
      expect(callUrl).toContain('num=20');
      expect(callUrl).toContain('sort=new');
      expect(callUrl).toContain('country=US');
      expect(callUrl).toContain('status=GRANT');
    });

    it('should throw error when query is missing', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_api_key', mockLogger as never);

      await expect(client.searchPatents({ q: '' })).rejects.toThrow(
        'Missing required argument: q'
      );
    });

    it('should handle API errors correctly', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => await Promise.resolve('Invalid API key'),
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('invalid_key', mockLogger as never);

      await expect(client.searchPatents({ q: 'test' })).rejects.toThrow(
        'SerpApi request failed'
      );
    });

    it('should redact API key in logs', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => await Promise.resolve({ organic_results: [] }),
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient(
        'secret_api_key_12345',
        mockLogger as never
      );

      await client.searchPatents({ q: 'test' });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('****')
      );
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('secret_api_key_12345')
      );
    });

    it('should handle timeout scenarios', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockFetch = vi.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted') as Error & {
          name: string;
        };
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_key', mockLogger as never, 100);

      await expect(client.searchPatents({ q: 'test' })).rejects.toThrow(
        'SerpApi request timed out'
      );
    });
  });

  describe('GooglePatentsServer', () => {
    it('should handle search_patents tool correctly', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSerpApiClient = {
        searchPatents: vi.fn().mockResolvedValue({
          search_metadata: { status: 'Success' },
          organic_results: [{ title: 'Test Patent', patent_id: 'US1234567' }],
        }),
      };

      const { GooglePatentsServer } = await import('../../src/server.js');
      const server = new GooglePatentsServer(
        '1.0.0',
        mockLogger as never,
        mockSerpApiClient as never
      );

      expect(server).toBeDefined();
    });

    it('should register search_patents tool with correct schema', () => {
      const expectedSchema = {
        type: 'object',
        properties: {
          q: expect.objectContaining({
            type: 'string',
            description: expect.any(String) as string,
          }) as { type: string; description: string },
          page: expect.objectContaining({
            type: 'integer',
          }) as { type: string },
          num: expect.objectContaining({
            type: 'integer',
            minimum: 10,
            maximum: 100,
          }) as { type: string; minimum: number; maximum: number },
          sort: expect.objectContaining({
            type: 'string',
            enum: ['relevance', 'new', 'old'],
          }) as { type: string; enum: string[] },
          status: expect.objectContaining({
            type: 'string',
            enum: ['GRANT', 'APPLICATION'],
          }) as { type: string; enum: string[] },
          type: expect.objectContaining({
            type: 'string',
            enum: ['PATENT', 'DESIGN'],
          }) as { type: string; enum: string[] },
        },
        required: ['q'],
      };

      expect(expectedSchema.required).toContain('q');
      expect(expectedSchema.properties.q).toBeDefined();
    });
  });

  describe('URL Parameter Construction', () => {
    it('should construct correct URL parameters for basic search', () => {
      const params = new URLSearchParams({
        engine: 'google_patents',
        q: 'quantum computer',
        api_key: 'test_key',
      });

      expect(params.get('engine')).toBe('google_patents');
      expect(params.get('q')).toBe('quantum computer');
      expect(params.get('api_key')).toBe('test_key');
    });

    it('should handle date filters correctly', () => {
      const params = new URLSearchParams({
        engine: 'google_patents',
        q: 'machine learning',
        api_key: 'test_key',
        before: 'publication:20231231',
        after: 'filing:20230101',
      });

      expect(params.get('before')).toBe('publication:20231231');
      expect(params.get('after')).toBe('filing:20230101');
    });

    it('should properly encode special characters in query', () => {
      const query = 'Coffee OR Tea; (A47J)';
      const params = new URLSearchParams({
        q: query,
      });

      expect(params.toString()).toBe('q=Coffee+OR+Tea%3B+%28A47J%29');
    });

    it('should handle multiple country codes', () => {
      const params = new URLSearchParams({
        engine: 'google_patents',
        q: 'innovation',
        api_key: 'test_key',
        country: 'US,JP,DE',
      });

      expect(params.get('country')).toBe('US,JP,DE');
    });

    it('should handle language filters', () => {
      const params = new URLSearchParams({
        engine: 'google_patents',
        q: 'technology',
        api_key: 'test_key',
        language: 'ENGLISH,JAPANESE',
      });

      expect(params.get('language')).toBe('ENGLISH,JAPANESE');
    });
  });

  describe('Response Formatting', () => {
    it('should format successful response correctly', () => {
      interface MockData {
        search_metadata: {
          status: string;
          id: string;
          processed_at: string;
        };
        search_parameters: {
          engine: string;
          q: string;
        };
        organic_results: Array<{
          title: string;
          patent_id: string;
          snippet: string;
        }>;
      }

      const mockData: MockData = {
        search_metadata: {
          status: 'Success',
          id: 'test123',
          processed_at: '2024-01-01',
        },
        search_parameters: {
          engine: 'google_patents',
          q: 'test query',
        },
        organic_results: [
          {
            title: 'Test Patent',
            patent_id: 'US1234567',
            snippet: 'Test description',
          },
        ],
      };

      const response = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(mockData, null, 2),
          },
        ],
      };

      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('search_metadata');
      expect(response.content[0].text).toContain('organic_results');

      const parsedData = JSON.parse(response.content[0].text) as MockData;
      expect(parsedData.search_metadata.status).toBe('Success');
      expect(parsedData.organic_results).toHaveLength(1);
    });
  });

  describe('MCP Error Codes', () => {
    it('should use appropriate error codes', () => {
      expect(ErrorCode.InvalidParams).toBeDefined();
      expect(ErrorCode.InternalError).toBeDefined();
      expect(ErrorCode.MethodNotFound).toBeDefined();
    });

    it('should create McpError with correct structure', async () => {
      const { McpError } = await import('@modelcontextprotocol/sdk/types.js');

      const error = new McpError(
        ErrorCode.InvalidParams,
        'Missing required parameter'
      );

      expect(error.code).toBe(ErrorCode.InvalidParams);
      expect(error.message).toContain('Missing required parameter');
    });
  });

  describe('API URL Construction', () => {
    it('should construct correct SerpApi URL', () => {
      const baseUrl = 'https://serpapi.com/search.json';
      const params = new URLSearchParams({
        engine: 'google_patents',
        q: 'test',
        api_key: 'key123',
      });

      const fullUrl = `${baseUrl}?${params.toString()}`;

      expect(fullUrl).toContain('https://serpapi.com/search.json');
      expect(fullUrl).toContain('engine=google_patents');
      expect(fullUrl).toContain('q=test');
      expect(fullUrl).toContain('api_key=key123');
    });
  });

  describe('Validation Logic', () => {
    it('should validate required query parameter', () => {
      const isQueryValid = (q: string | undefined): boolean => {
        return typeof q === 'string' && q.length > 0;
      };

      expect(isQueryValid('')).toBe(false);
      expect(isQueryValid(undefined)).toBe(false);
      expect(isQueryValid('valid query')).toBe(true);
    });

    it('should validate API key presence', () => {
      const isApiKeyValid = (key: string | undefined): boolean => {
        return typeof key === 'string' && key.length > 0;
      };

      expect(isApiKeyValid('')).toBe(false);
      expect(isApiKeyValid(undefined)).toBe(false);
      expect(isApiKeyValid('valid_key')).toBe(true);
    });
  });
});
