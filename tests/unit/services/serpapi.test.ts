import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { SerpApiError } from '../../../src/errors.js';
import { SerpApiClient } from '../../../src/services/serpapi.js';
import { createMockLogger } from '../../helpers/test-utils.js';

let mockLogger: ReturnType<typeof createMockLogger>;

function makeFetch(response: Partial<Response>) {
  return mock().mockResolvedValue(response);
}

let originalFetch: typeof fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  mockLogger = createMockLogger();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('SerpApiClient', () => {
  it('should construct correct URL parameters for basic search', async () => {
    const mockFetch = makeFetch({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          search_metadata: { status: 'Success' },
          organic_results: [],
        }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = new SerpApiClient('test_api_key', mockLogger);
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
    const mockFetch = makeFetch({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ organic_results: [] }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = new SerpApiClient('test_api_key', mockLogger);
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
    const mockResponse = {
      organic_results: [
        {
          patent_id: 'patent/FI127693B/en',
          title: 'Test Patent',
          assignee: 'Skyfora Oy',
        },
      ],
    };
    const mockFetch = makeFetch({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = new SerpApiClient('test_api_key', mockLogger);
    const result = await client.searchPatents({ assignee: 'Skyfora', num: 10 });

    expect(result).toEqual(mockResponse);
    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain('engine=google_patents');
    expect(callUrl).toContain('q=');
    expect(callUrl).toContain('assignee=Skyfora');
    expect(callUrl).toContain('num=10');
  });

  it('should handle API errors correctly', async () => {
    const mockFetch = makeFetch({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () => Promise.resolve('Invalid API key'),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = new SerpApiClient('invalid_key', mockLogger);
    await expect(client.searchPatents({ q: 'test' })).rejects.toThrow(
      'Authentication failed'
    );
  });

  it('should throw SerpApiError with statusCode on API errors', async () => {
    const mockFetch = makeFetch({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () => Promise.resolve('Invalid API key'),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = new SerpApiClient('invalid_key', mockLogger);
    try {
      await client.searchPatents({ q: 'test' });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SerpApiError);
      expect((err as SerpApiError).statusCode).toBe(401);
    }
  });

  it('should not include HTML body in error message on non-ok response', async () => {
    const htmlBody =
      '<!DOCTYPE html><html><body><h1>401 Unauthorized</h1></body></html>';
    const mockFetch = makeFetch({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () => Promise.resolve(htmlBody),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = new SerpApiClient('invalid_key', mockLogger);
    try {
      await client.searchPatents({ q: 'test' });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SerpApiError);
      const serpErr = err as SerpApiError;
      expect(serpErr.userMessage).not.toContain('<html');
      expect(serpErr.userMessage).not.toContain('DOCTYPE');
      expect(serpErr.userMessage).toContain('Authentication failed');
    }
  });

  it('should handle 200 response with HTML body (non-JSON)', async () => {
    const mockFetch = makeFetch({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError("Unexpected token '<'")),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = new SerpApiClient('test_key', mockLogger);
    try {
      await client.searchPatents({ q: 'test' });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SerpApiError);
      expect((err as SerpApiError).userMessage).toContain('non-JSON');
    }
  });

  it('should produce clean error message on 500 response', async () => {
    const mockFetch = makeFetch({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve('Server error'),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = new SerpApiClient('test_key', mockLogger);
    try {
      await client.searchPatents({ q: 'test' });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SerpApiError);
      expect((err as SerpApiError).userMessage).toContain('server error');
      expect((err as SerpApiError).statusCode).toBe(500);
    }
  });

  it('should extract JSON error field from error response', async () => {
    const mockFetch = makeFetch({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () =>
        Promise.resolve(JSON.stringify({ error: 'Invalid API key.' })),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = new SerpApiClient('bad_key', mockLogger);
    try {
      await client.searchPatents({ q: 'test' });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SerpApiError);
      // The logger should have received the extracted error detail
      const errorCalls = mockLogger.error.mock.calls.flat();
      expect(
        errorCalls.some((c: string) => c.includes('Invalid API key'))
      ).toBe(true);
    }
  });

  it('should not log API key in any log calls', async () => {
    const mockFetch = makeFetch({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ organic_results: [] }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = new SerpApiClient('secret_api_key_12345', mockLogger);
    await client.searchPatents({ q: 'test' });

    const allLogCalls = [
      ...mockLogger.info.mock.calls,
      ...mockLogger.warn.mock.calls,
      ...mockLogger.error.mock.calls,
      ...mockLogger.debug.mock.calls,
    ].flat();

    for (const call of allLogCalls) {
      expect(String(call)).not.toContain('secret_api_key_12345');
    }
  });

  it('should handle timeout scenarios', async () => {
    const mockFetch = mock().mockImplementation(() => {
      const error = new Error('The operation was aborted') as Error & {
        name: string;
      };
      error.name = 'AbortError';
      return Promise.reject(error);
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = new SerpApiClient('test_key', mockLogger, 100);
    await expect(client.searchPatents({ q: 'test' })).rejects.toThrow(
      'SerpApi request timed out'
    );
  });

  it('should call getPatentDetails with correct parameters', async () => {
    const mockFetch = makeFetch({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          patent_id: 'US1234567',
          title: 'Test Patent',
          description: 'Test description',
        }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = new SerpApiClient('test_api_key', mockLogger);
    await client.getPatentDetails('US1234567');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('engine=google_patents_details'),
      expect.any(Object)
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('patent_id=US1234567'),
      expect.any(Object)
    );
  });

  it('should handle getPatentDetails API errors correctly', async () => {
    const mockFetch = makeFetch({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve('Patent not found'),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = new SerpApiClient('invalid_key', mockLogger);
    await expect(client.getPatentDetails('INVALID')).rejects.toThrow(
      'SerpApi request failed'
    );
  });

  it('should handle getPatentDetails timeout scenarios', async () => {
    const mockFetch = mock().mockImplementation(() => {
      const error = new Error('The operation was aborted') as Error & {
        name: string;
      };
      error.name = 'AbortError';
      return Promise.reject(error);
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = new SerpApiClient('test_key', mockLogger, 100);
    await expect(client.getPatentDetails('US1234567')).rejects.toThrow(
      'SerpApi request timed out'
    );
  });
});
