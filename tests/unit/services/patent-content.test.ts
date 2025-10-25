import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('PatentContentService', () => {
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

      const { PatentContentService } = await import(
        '../../../src/services/patent-content.js'
      );
      const service = new PatentContentService(mockLogger as never);

      const result = await service.fetchContent(
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

      const { PatentContentService } = await import(
        '../../../src/services/patent-content.js'
      );
      const service = new PatentContentService(mockLogger as never);

      const result = await service.fetchContent(
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

      const { PatentContentService } = await import(
        '../../../src/services/patent-content.js'
      );
      const service = new PatentContentService(mockLogger as never);

      const result = await service.fetchContent(
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

      const { PatentContentService } = await import(
        '../../../src/services/patent-content.js'
      );
      const service = new PatentContentService(mockLogger as never);

      const result = await service.fetchContent(
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

      const { PatentContentService } = await import(
        '../../../src/services/patent-content.js'
      );
      const service = new PatentContentService(mockLogger as never);

      const result = await service.fetchContent(
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

      const { PatentContentService } = await import(
        '../../../src/services/patent-content.js'
      );
      const service = new PatentContentService(mockLogger as never);

      const result = await service.fetchContent(
        'https://patents.google.com/patent/US1234567'
      );

      expect(result.description).not.toContain('alert');
      expect(result.description).not.toContain('color:red');
      expect(result.description).toContain('Valid content');
    });
  });

  describe('Patent ID to URL Conversion', () => {
    it('should convert patent ID to URL', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => await Promise.resolve('<html></html>'),
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { PatentContentService } = await import(
        '../../../src/services/patent-content.js'
      );
      const service = new PatentContentService(mockLogger as never);

      await service.fetchContent('US1234567A');

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toBe('https://patents.google.com/patent/US1234567A');
    });

    it('should handle patent ID with path prefix', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => await Promise.resolve('<html></html>'),
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { PatentContentService } = await import(
        '../../../src/services/patent-content.js'
      );
      const service = new PatentContentService(mockLogger as never);

      await service.fetchContent('patent/US1234567A/en');

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toBe('https://patents.google.com/patent/US1234567A');
    });

    it('should pass through full URLs unchanged', async () => {
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => await Promise.resolve('<html></html>'),
      });

      vi.doMock('node-fetch', () => ({
        default: mockFetch,
      }));

      const { PatentContentService } = await import(
        '../../../src/services/patent-content.js'
      );
      const service = new PatentContentService(mockLogger as never);

      const fullUrl = 'https://patents.google.com/patent/US1234567A';
      await service.fetchContent(fullUrl);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toBe(fullUrl);
    });
  });

  describe('Error Handling', () => {
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

      const { PatentContentService } = await import(
        '../../../src/services/patent-content.js'
      );
      const service = new PatentContentService(mockLogger as never);

      const result = await service.fetchContent(
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

      const { PatentContentService } = await import(
        '../../../src/services/patent-content.js'
      );
      const service = new PatentContentService(mockLogger as never);

      const result = await service.fetchContent(
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

      const { PatentContentService } = await import(
        '../../../src/services/patent-content.js'
      );
      const service = new PatentContentService(mockLogger as never, 100);

      const result = await service.fetchContent(
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

      const { PatentContentService } = await import(
        '../../../src/services/patent-content.js'
      );
      const service = new PatentContentService(mockLogger as never);

      const result = await service.fetchContent(
        'https://patents.google.com/patent/US1234567'
      );

      expect(result.content_included).toBe(false);
    });
  });
});

