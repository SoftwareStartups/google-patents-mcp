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

const mockFetchPatentData = mock();

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
  SerpApiClient: class {},
}));

await mock.module('../../../../src/services/patent.js', () => ({
  PatentService: class {
    fetchPatentData = mockFetchPatentData;
  },
}));

interface GetContext {
  parameters: { patentId: string };
  flags: {
    json: boolean;
    include?: string;
    maxLength?: number;
  };
}

const defaultCtx: GetContext = {
  parameters: { patentId: 'US7654321B2' },
  flags: {
    json: false,
    include: undefined,
    maxLength: undefined,
  },
};

const { get } = await import('../../../../src/cli/commands/get.js');
const handler = (
  get as unknown as { handler: (ctx: GetContext) => Promise<void> }
).handler;

describe('get command', () => {
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
    mockFetchPatentData.mockResolvedValue({
      patent_id: 'US7654321B2',
      title: 'Test Patent',
      abstract: 'A test abstract',
    });
  });

  afterEach(() => {
    mock.restore();
  });

  it('fetches patent with default includes', async () => {
    await handler({ ...defaultCtx });
    expect(mockFetchPatentData).toHaveBeenCalledWith('US7654321B2', {
      includeMetadata: true,
      includeAbstract: true,
      includeClaims: false,
      includeDescription: false,
      includeFamilyMembers: false,
      includeCitations: false,
      maxLength: undefined,
    });
  });

  it('outputs structured text by default', async () => {
    await handler({ ...defaultCtx });
    const output = stdoutOutput.join('');
    expect(output).toContain('Patent: US7654321B2');
    expect(output).toContain('Title:       Test Patent');
    expect(output).toContain('A test abstract');
  });

  it('outputs JSON with json flag', async () => {
    await handler({
      ...defaultCtx,
      flags: { ...defaultCtx.flags, json: true },
    });
    const output = JSON.parse(stdoutOutput.join('')) as Record<string, unknown>;
    expect(output.patent_id).toBe('US7654321B2');
    expect(output.title).toBe('Test Patent');
  });

  it('parses include option', async () => {
    await handler({
      ...defaultCtx,
      parameters: { patentId: 'US123' },
      flags: { ...defaultCtx.flags, include: 'claims,description' },
    });
    expect(mockFetchPatentData).toHaveBeenCalledWith('US123', {
      includeMetadata: false,
      includeAbstract: false,
      includeClaims: true,
      includeDescription: true,
      includeFamilyMembers: false,
      includeCitations: false,
      maxLength: undefined,
    });
  });

  it('passes max-length option', async () => {
    await handler({
      ...defaultCtx,
      parameters: { patentId: 'US123' },
      flags: { ...defaultCtx.flags, maxLength: 5000 },
    });
    expect(mockFetchPatentData).toHaveBeenCalledWith(
      'US123',
      expect.objectContaining({ maxLength: 5000 })
    );
  });

  it('throws on invalid include value', async () => {
    await expect(
      handler({
        ...defaultCtx,
        parameters: { patentId: 'US123' },
        flags: { ...defaultCtx.flags, include: 'invalid' },
      })
    ).rejects.toThrow('Invalid include value: "invalid"');
  });
});
