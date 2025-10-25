import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Patent Content Fetching', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('HTML Parsing', () => {
    it('should extract claims from patent HTML', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockHtml = `
        <html>
          <section itemprop="claims">
            <div itemprop="claim" num="1">A method for testing comprising...</div>
            <div itemprop="claim" num="2">The method of claim 1, wherein...</div>
          </section>
        </html>
      `;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => await Promise.resolve(mockHtml),
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_key', mockLogger as never);

      const result = await client.fetchPatentContent(
        'https://patents.google.com/patent/US1234567'
      );

      expect(result.content_included).toBe(true);
      expect(result.claims).toBeDefined();
      expect(result.claims).toHaveLength(2);
      expect(result.claims?.[0]).toContain('1. A method for testing');
      expect(result.claims?.[1]).toContain('2. The method of claim 1');
    });

    it('should extract description from patent HTML', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockHtml = `
        <html>
          <section itemprop="description">
            <p>This invention relates to a novel method...</p>
            <p>The background of the invention is...</p>
          </section>
        </html>
      `;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => await Promise.resolve(mockHtml),
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_key', mockLogger as never);

      const result = await client.fetchPatentContent(
        'https://patents.google.com/patent/US1234567'
      );

      expect(result.content_included).toBe(true);
      expect(result.description).toBeDefined();
      expect(result.description).toContain('This invention relates');
    });

    it('should extract abstract if description not available', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockHtml = `
        <html>
          <section itemprop="abstract">
            <p>A brief summary of the invention...</p>
          </section>
        </html>
      `;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => await Promise.resolve(mockHtml),
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_key', mockLogger as never);

      const result = await client.fetchPatentContent(
        'https://patents.google.com/patent/US1234567'
      );

      expect(result.content_included).toBe(true);
      expect(result.description).toContain('Abstract:');
      expect(result.description).toContain('A brief summary');
    });

    it('should combine description and claims into full_text', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockHtml = `
        <html>
          <section itemprop="description">
            <p>This is the description.</p>
          </section>
          <section itemprop="claims">
            <div itemprop="claim" num="1">Claim one</div>
            <div itemprop="claim" num="2">Claim two</div>
          </section>
        </html>
      `;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => await Promise.resolve(mockHtml),
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_key', mockLogger as never);

      const result = await client.fetchPatentContent(
        'https://patents.google.com/patent/US1234567'
      );

      expect(result.full_text).toBeDefined();
      expect(result.full_text).toContain('DESCRIPTION:');
      expect(result.full_text).toContain('CLAIMS:');
      expect(result.full_text).toContain('This is the description');
      expect(result.full_text).toContain('1. Claim one');
    });

    it('should handle HTML entities correctly', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockHtml = `
        <html>
          <section itemprop="description">
            <p>Testing&nbsp;&amp;&nbsp;&lt;tags&gt;&nbsp;&quot;quotes&quot;</p>
          </section>
        </html>
      `;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => await Promise.resolve(mockHtml),
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_key', mockLogger as never);

      const result = await client.fetchPatentContent(
        'https://patents.google.com/patent/US1234567'
      );

      expect(result.description).toContain('Testing & <tags> "quotes"');
    });

    it('should remove script and style tags', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockHtml = `
        <html>
          <section itemprop="description">
            <script>alert('test')</script>
            <style>.test{color:red}</style>
            <p>Valid content</p>
          </section>
        </html>
      `;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => await Promise.resolve(mockHtml),
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_key', mockLogger as never);

      const result = await client.fetchPatentContent(
        'https://patents.google.com/patent/US1234567'
      );

      expect(result.description).not.toContain('alert');
      expect(result.description).not.toContain('color:red');
      expect(result.description).toContain('Valid content');
    });
  });

  describe('Content Fetching Error Handling', () => {
    it('should handle HTTP errors gracefully', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_key', mockLogger as never);

      const result = await client.fetchPatentContent(
        'https://patents.google.com/patent/INVALID'
      );

      expect(result.content_included).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch patent content')
      );
    });

    it('should handle network errors', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockFetch = vi
        .fn()
        .mockRejectedValue(new Error('Network error'));

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_key', mockLogger as never);

      const result = await client.fetchPatentContent(
        'https://patents.google.com/patent/US1234567'
      );

      expect(result.content_included).toBe(false);
    });

    it('should handle timeout', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockFetch = vi.fn().mockImplementation(() => {
        const error = new Error('Timeout') as Error & { name: string };
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_key', mockLogger as never, 100);

      const result = await client.fetchPatentContent(
        'https://patents.google.com/patent/US1234567'
      );

      expect(result.content_included).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('timed out')
      );
    });

    it('should handle malformed HTML', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockHtml = '<html><invalid></html>';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => await Promise.resolve(mockHtml),
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_key', mockLogger as never);

      const result = await client.fetchPatentContent(
        'https://patents.google.com/patent/US1234567'
      );

      expect(result.content_included).toBe(false);
    });
  });

  describe('Integration with Search', () => {
    it('should fetch full content when include_full_content is true', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSearchResponse = {
        organic_results: [
          {
            patent_id: 'US1234567',
            title: 'Test Patent',
            patent_link: 'https://patents.google.com/patent/US1234567',
          },
        ],
      };

      const mockPatentHtml = `
        <html>
          <section itemprop="description"><p>Description text</p></section>
          <section itemprop="claims">
            <div itemprop="claim" num="1">Claim 1</div>
          </section>
        </html>
      `;

      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation((_url: string) => {
        callCount++;
        if (callCount === 1) {
          // First call is to SerpApi
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => await Promise.resolve(mockSearchResponse),
          });
        } else {
          // Second call is to fetch patent content
          return Promise.resolve({
            ok: true,
            text: async () => await Promise.resolve(mockPatentHtml),
          });
        }
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_key', mockLogger as never);

      const result = await client.searchPatents({
        q: 'test',
        include_full_content: true,
      });

      expect(result.organic_results).toBeDefined();
      expect(result.organic_results?.[0].full_content).toBeDefined();
      expect(result.organic_results?.[0].full_content?.content_included).toBe(
        true
      );
      expect(result.organic_results?.[0].full_content?.claims).toBeDefined();
      expect(result.organic_results?.[0].full_content?.description).toBeDefined();
      expect(result.organic_results?.[0].full_content?.full_text).toBeDefined();
    });

    it('should fetch only claims when include_claims is true', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSearchResponse = {
        organic_results: [
          {
            patent_id: 'US1234567',
            title: 'Test Patent',
            patent_link: 'https://patents.google.com/patent/US1234567',
          },
        ],
      };

      const mockPatentHtml = `
        <html>
          <section itemprop="description"><p>Description text</p></section>
          <section itemprop="claims">
            <div itemprop="claim" num="1">Claim 1</div>
          </section>
        </html>
      `;

      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => await Promise.resolve(mockSearchResponse),
          });
        } else {
          return Promise.resolve({
            ok: true,
            text: async () => await Promise.resolve(mockPatentHtml),
          });
        }
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_key', mockLogger as never);

      const result = await client.searchPatents({
        q: 'test',
        include_claims: true,
      });

      expect(result.organic_results?.[0].full_content?.claims).toBeDefined();
      expect(result.organic_results?.[0].full_content?.full_text).toBeUndefined();
    });

    it('should fetch only description when include_description is true', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSearchResponse = {
        organic_results: [
          {
            patent_id: 'US1234567',
            title: 'Test Patent',
            patent_link: 'https://patents.google.com/patent/US1234567',
          },
        ],
      };

      const mockPatentHtml = `
        <html>
          <section itemprop="description"><p>Description text</p></section>
          <section itemprop="claims">
            <div itemprop="claim" num="1">Claim 1</div>
          </section>
        </html>
      `;

      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => await Promise.resolve(mockSearchResponse),
          });
        } else {
          return Promise.resolve({
            ok: true,
            text: async () => await Promise.resolve(mockPatentHtml),
          });
        }
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_key', mockLogger as never);

      const result = await client.searchPatents({
        q: 'test',
        include_description: true,
      });

      expect(result.organic_results?.[0].full_content?.description).toBeDefined();
      expect(result.organic_results?.[0].full_content?.full_text).toBeUndefined();
    });

    it('should not fetch content when no include flags are set', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSearchResponse = {
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
        json: async () => await Promise.resolve(mockSearchResponse),
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_key', mockLogger as never);

      const result = await client.searchPatents({
        q: 'test',
      });

      expect(result.organic_results?.[0].full_content).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only SerpApi call
    });

    it('should handle patents without patent_link gracefully', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSearchResponse = {
        organic_results: [
          {
            patent_id: 'US1234567',
            title: 'Test Patent',
            // No patent_link
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => await Promise.resolve(mockSearchResponse),
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_key', mockLogger as never);

      const result = await client.searchPatents({
        q: 'test',
        include_full_content: true,
      });

      expect(result.organic_results?.[0].full_content).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only SerpApi call
    });

    it('should process multiple patents in parallel', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSearchResponse = {
        organic_results: [
          {
            patent_id: 'US1234567',
            patent_link: 'https://patents.google.com/patent/US1234567',
          },
          {
            patent_id: 'US7654321',
            patent_link: 'https://patents.google.com/patent/US7654321',
          },
        ],
      };

      const mockPatentHtml = `
        <html>
          <section itemprop="claims">
            <div itemprop="claim" num="1">Claim 1</div>
          </section>
        </html>
      `;

      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => await Promise.resolve(mockSearchResponse),
          });
        } else {
          return Promise.resolve({
            ok: true,
            text: async () => await Promise.resolve(mockPatentHtml),
          });
        }
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_key', mockLogger as never);

      const result = await client.searchPatents({
        q: 'test',
        include_claims: true,
      });

      expect(result.organic_results).toHaveLength(2);
      expect(result.organic_results?.[0].full_content?.content_included).toBe(
        true
      );
      expect(result.organic_results?.[1].full_content?.content_included).toBe(
        true
      );
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 SerpApi + 2 patents
    });

    it('should continue on individual patent fetch failures', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockSearchResponse = {
        organic_results: [
          {
            patent_id: 'US1234567',
            patent_link: 'https://patents.google.com/patent/US1234567',
          },
          {
            patent_id: 'US7654321',
            patent_link: 'https://patents.google.com/patent/US7654321',
          },
        ],
      };

      const mockPatentHtml = `
        <html>
          <section itemprop="claims">
            <div itemprop="claim" num="1">Claim 1</div>
          </section>
        </html>
      `;

      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // SerpApi call
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => await Promise.resolve(mockSearchResponse),
          });
        } else if (callCount === 2) {
          // First patent fails
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
          });
        } else {
          // Second patent succeeds
          return Promise.resolve({
            ok: true,
            text: async () => await Promise.resolve(mockPatentHtml),
          });
        }
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { SerpApiClient } = await import('../../src/services/serpapi.js');
      const client = new SerpApiClient('test_key', mockLogger as never);

      const result = await client.searchPatents({
        q: 'test',
        include_claims: true,
      });

      expect(result.organic_results).toHaveLength(2);
      expect(result.organic_results?.[0].full_content?.content_included).toBe(
        false
      );
      expect(result.organic_results?.[1].full_content?.content_included).toBe(
        true
      );
    });
  });
});

