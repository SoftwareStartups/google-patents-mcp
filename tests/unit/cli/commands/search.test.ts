import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import { createMockLogger } from '../../../helpers/test-utils.js';

const mockSearchPatents = mock();

await mock.module('clerc', () => ({
  defineCommand: (config: Record<string, unknown>, handler: unknown) => ({
    ...config,
    handler,
  }),
}));

await mock.module('../../../../src/config.js', () => ({
  getConfig: () => ({
    serpApiKey: 'test-key',
    serpApiBaseUrl: 'https://serpapi.com',
    logLevel: 'error',
  }),
}));

await mock.module('../../../../src/logger.js', () => ({
  createLogger: () => createMockLogger(),
}));

await mock.module('../../../../src/services/serpapi.js', () => ({
  SerpApiClient: class {
    searchPatents = mockSearchPatents;
  },
}));

interface SearchContext {
  parameters: { query?: string };
  flags: {
    json: boolean;
    page?: number;
    num?: number;
    sort?: string;
    before?: string;
    after?: string;
    inventor?: string;
    assignee?: string;
    country?: string;
    language?: string;
    status?: string;
    type?: string;
    scholar: boolean;
  };
}

const defaultCtx: SearchContext = {
  parameters: { query: undefined },
  flags: {
    json: false,
    page: undefined,
    num: undefined,
    sort: undefined,
    before: undefined,
    after: undefined,
    inventor: undefined,
    assignee: undefined,
    country: undefined,
    language: undefined,
    status: undefined,
    type: undefined,
    scholar: false,
  },
};

// Import after mocks are set up
const { search } = await import('../../../../src/cli/commands/search.js');
const handler = (
  search as unknown as { handler: (ctx: SearchContext) => Promise<void> }
).handler;

describe('search command', () => {
  let stdoutOutput: string[];

  beforeEach(() => {
    stdoutOutput = [];
    spyOn(process.stdout, 'write').mockImplementation(
      (chunk: string | Uint8Array<ArrayBufferLike>) => {
        stdoutOutput.push(
          typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString()
        );
        return true;
      }
    );
    mockSearchPatents.mockResolvedValue({
      organic_results: [
        { title: 'Test Patent', patent_id: 'US123', assignee: 'TestCo' },
      ],
    });
  });

  afterEach(() => {
    mock.restore();
  });

  it('searches with positional query', async () => {
    await handler({
      ...defaultCtx,
      parameters: { query: 'quantum computing' },
    });
    expect(mockSearchPatents).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'quantum computing' })
    );
  });

  it('outputs structured text by default', async () => {
    await handler({ ...defaultCtx, parameters: { query: 'test' } });
    const output = stdoutOutput.join('');
    expect(output).toContain('Title:');
    expect(output).toContain('Test Patent');
    expect(output).toContain('1 result(s)');
  });

  it('outputs JSON with json flag', async () => {
    await handler({
      ...defaultCtx,
      parameters: { query: 'test' },
      flags: { ...defaultCtx.flags, json: true },
    });
    const output = JSON.parse(stdoutOutput.join('')) as unknown[];
    expect(Array.isArray(output)).toBe(true);
    expect(output).toHaveLength(1);
  });

  it('passes filter options to searchPatents', async () => {
    await handler({
      ...defaultCtx,
      parameters: { query: 'test' },
      flags: { ...defaultCtx.flags, num: 5, sort: 'new', assignee: 'Google' },
    });
    expect(mockSearchPatents).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'test',
        num: 5,
        sort: 'new',
        assignee: 'Google',
      })
    );
  });

  it('handles empty results', async () => {
    mockSearchPatents.mockResolvedValue({ organic_results: [] });
    await handler({ ...defaultCtx, parameters: { query: 'nothing' } });
    const output = stdoutOutput.join('');
    expect(output).toContain('0 result(s)');
  });

  it('searches without query using filters only', async () => {
    await handler({
      ...defaultCtx,
      flags: { ...defaultCtx.flags, assignee: 'Samsung', status: 'GRANT' },
    });
    expect(mockSearchPatents).toHaveBeenCalledWith(
      expect.objectContaining({
        assignee: 'Samsung',
        status: 'GRANT',
      })
    );
  });
});
