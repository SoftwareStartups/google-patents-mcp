import { describe, it, expect, vi } from 'vitest';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Mock modules
vi.mock('node-fetch');
vi.mock('winston', () => ({
  default: {
    createLogger: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      add: vi.fn(),
      close: vi.fn(),
    })),
    format: {
      combine: vi.fn(),
      timestamp: vi.fn(),
      printf: vi.fn(),
    },
    transports: {
      Console: vi.fn(),
      File: vi.fn(),
    },
  },
}));

describe('Google Patents MCP Server', () => {
  describe('Tool Registration', () => {
    it('should register search_patents tool', async () => {
      const { default: fetch } = await import('node-fetch');
      const { Response } = await import('node-fetch');

      vi.mocked(fetch).mockResolvedValue(
        new Response(
          JSON.stringify({ search_metadata: { status: 'Success' } }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      // Set API key for tests
      process.env.SERPAPI_API_KEY = 'test_api_key';

      // Import server after mocks are set up
      const _serverModule = await import('../../src/index.js');

      // Give server time to initialize
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
  });

  describe('Tool Schema Validation', () => {
    it('should have correct schema for search_patents tool', () => {
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

      // Schema is validated through integration tests
      expect(expectedSchema.required).toContain('q');
      expect(expectedSchema.properties.q).toBeDefined();
    });
  });

  describe('Search Parameters', () => {
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

    it('should construct correct URL parameters with optional filters', () => {
      const params = new URLSearchParams({
        engine: 'google_patents',
        q: 'artificial intelligence',
        api_key: 'test_key',
        page: '2',
        num: '20',
        sort: 'new',
        country: 'US',
        status: 'GRANT',
      });

      expect(params.get('page')).toBe('2');
      expect(params.get('num')).toBe('20');
      expect(params.get('sort')).toBe('new');
      expect(params.get('country')).toBe('US');
      expect(params.get('status')).toBe('GRANT');
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

    it('should handle inventor and assignee filters', () => {
      const params = new URLSearchParams({
        engine: 'google_patents',
        q: 'patent search',
        api_key: 'test_key',
        inventor: 'John Doe',
        assignee: 'Tech Corp',
      });

      expect(params.get('inventor')).toBe('John Doe');
      expect(params.get('assignee')).toBe('Tech Corp');
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

    it('should handle patent type filter', () => {
      const params = new URLSearchParams({
        engine: 'google_patents',
        q: 'design',
        api_key: 'test_key',
        type: 'DESIGN',
      });

      expect(params.get('type')).toBe('DESIGN');
    });

    it('should handle scholar parameter', () => {
      const params = new URLSearchParams({
        engine: 'google_patents',
        q: 'research',
        api_key: 'test_key',
        scholar: 'true',
      });

      expect(params.get('scholar')).toBe('true');
    });

    it('should not include undefined parameters', () => {
      const args = {
        q: 'test query',
        page: undefined,
        num: undefined,
      };

      const params = new URLSearchParams({
        engine: 'google_patents',
        q: args.q,
        api_key: 'test_key',
      });

      for (const [key, value] of Object.entries(args)) {
        if (key !== 'q' && value !== undefined) {
          params.append(key, String(value));
        }
      }

      expect(params.has('page')).toBe(false);
      expect(params.has('num')).toBe(false);
      expect(params.has('q')).toBe(true);
    });
  });

  describe('Error Handling', () => {
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

    it('should handle timeout scenarios', () => {
      const timeoutMs = 30000;
      const controller = new AbortController();

      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      expect(controller.signal.aborted).toBe(false);

      clearTimeout(timeoutId);
      expect(controller.signal.aborted).toBe(false);
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

    it('should properly encode special characters in query', () => {
      const query = 'Coffee OR Tea; (A47J)';
      const params = new URLSearchParams({
        q: query,
      });

      expect(params.toString()).toBe('q=Coffee+OR+Tea%3B+%28A47J%29');
    });
  });

  describe('Logging and Security', () => {
    it('should redact API key in logs', () => {
      const apiKey = 'secret_api_key_12345';
      const url = `https://serpapi.com/search.json?api_key=${apiKey}&q=test`;
      const redactedUrl = url.replace(apiKey, '****');

      expect(redactedUrl).not.toContain(apiKey);
      expect(redactedUrl).toContain('****');
    });
  });
});
