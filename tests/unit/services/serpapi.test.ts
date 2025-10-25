import { beforeEach, describe, expect, it, vi } from 'vitest';

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

    const { SerpApiClient } = await import('../../../src/services/serpapi.js');
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

    const { SerpApiClient } = await import('../../../src/services/serpapi.js');
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

  it('should allow empty query when using filters (assignee only)', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockResponse = {
      organic_results: [
        {
          patent_id: 'patent/FI127693B/en',
          title: 'Test Patent',
          assignee: 'Skyfora Oy',
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => await Promise.resolve(mockResponse),
    });

    vi.doMock('node-fetch', () => ({
      default: mockFetch,
    }));

    const { SerpApiClient } = await import('../../../src/services/serpapi.js');
    const client = new SerpApiClient('test_api_key', mockLogger as never);

    const result = await client.searchPatents({
      assignee: 'Skyfora',
      num: 10,
    });

    expect(result).toEqual(mockResponse);

    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain('engine=google_patents');
    expect(callUrl).toContain('q=');
    expect(callUrl).toContain('assignee=Skyfora');
    expect(callUrl).toContain('num=10');
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

    const { SerpApiClient } = await import('../../../src/services/serpapi.js');
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

    const { SerpApiClient } = await import('../../../src/services/serpapi.js');
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

    const { SerpApiClient } = await import('../../../src/services/serpapi.js');
    const client = new SerpApiClient('test_key', mockLogger as never, 100);

    await expect(client.searchPatents({ q: 'test' })).rejects.toThrow(
      'SerpApi request timed out'
    );
  });

  it('should not include full_content in results', async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const mockResponse = {
      organic_results: [
        {
          patent_id: 'US1234567',
          title: 'Test Patent',
          patent_link: 'https://patents.google.com/patent/US1234567',
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => await Promise.resolve(mockResponse),
    });

    vi.doMock('node-fetch', () => ({
      default: mockFetch,
    }));

    const { SerpApiClient } = await import('../../../src/services/serpapi.js');
    const client = new SerpApiClient('test_key', mockLogger as never);

    const result = await client.searchPatents({ q: 'test' });

    expect(result.organic_results?.[0]).not.toHaveProperty('full_content');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

