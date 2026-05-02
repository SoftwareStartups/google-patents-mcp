import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import { SerpApiError } from '../../../../src/errors.js';
import { createMockLogger } from '../../../helpers/test-utils.js';

const mockSetSecret = mock(() => Promise.resolve());
const mockSanitizeCredential = mock((v: string) => v.trim());
const mockSearchPatents = mock();

await mock.module('clerc', () => ({
  defineCommand: (config: Record<string, unknown>, handler: unknown) => ({
    ...config,
    handler,
  }),
}));

await mock.module('../../../../src/auth/keychain.js', () => ({
  setSecret: mockSetSecret,
  sanitizeCredential: mockSanitizeCredential,
}));

await mock.module('../../../../src/logger.js', () => ({
  createLogger: () => createMockLogger(),
}));

await mock.module('../../../../src/services/serpapi.js', () => ({
  SerpApiClient: class {
    searchPatents = mockSearchPatents;
  },
}));

interface LoginContext {
  flags: {
    apiKey?: string;
    skipValidation?: boolean;
    json?: boolean;
  };
}

const { login } = await import('../../../../src/cli/commands/login.js');
const handler = (
  login as unknown as { handler: (ctx: LoginContext) => Promise<void> }
).handler;

describe('login command', () => {
  let stderrOutput: string[];
  let stdoutOutput: string[];

  beforeEach(() => {
    stderrOutput = [];
    stdoutOutput = [];
    mockSetSecret.mockClear();
    mockSanitizeCredential.mockClear();
    mockSanitizeCredential.mockImplementation((v: string) => v.trim());
    mockSearchPatents.mockClear();
    spyOn(process.stderr, 'write').mockImplementation(
      (chunk: string | Uint8Array<ArrayBufferLike>) => {
        stderrOutput.push(
          typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString()
        );
        return true;
      }
    );
    spyOn(process.stdout, 'write').mockImplementation(
      (chunk: string | Uint8Array<ArrayBufferLike>) => {
        stdoutOutput.push(
          typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString()
        );
        return true;
      }
    );
    mockSearchPatents.mockResolvedValue({ organic_results: [] });
  });

  afterEach(() => {
    mock.restore();
  });

  it('saves API key to keychain from --api-key flag', async () => {
    await handler({ flags: { apiKey: 'test-key-123', skipValidation: true } });
    expect(mockSetSecret).toHaveBeenCalledWith(
      'SERPAPI_API_KEY',
      'test-key-123'
    );
  });

  it('prints success message mentioning keychain', async () => {
    await handler({ flags: { apiKey: 'my-key', skipValidation: true } });
    const output = stdoutOutput.join('');
    expect(output).toContain('OS keychain');
  });

  it('validates API key by default', async () => {
    await handler({ flags: { apiKey: 'valid-key' } });
    expect(mockSearchPatents).toHaveBeenCalled();
    expect(mockSetSecret).toHaveBeenCalledWith('SERPAPI_API_KEY', 'valid-key');
  });

  it('skips validation with --skip-validation', async () => {
    await handler({ flags: { apiKey: 'any-key', skipValidation: true } });
    expect(mockSearchPatents).not.toHaveBeenCalled();
    expect(mockSetSecret).toHaveBeenCalled();
  });

  it('throws on 401 validation failure (invalid key)', async () => {
    mockSearchPatents.mockRejectedValue(
      new SerpApiError('Authentication failed.', { statusCode: 401 })
    );
    await expect(handler({ flags: { apiKey: 'bad-key' } })).rejects.toThrow(
      'invalid'
    );
    expect(mockSetSecret).not.toHaveBeenCalled();
  });

  it('warns but saves on network validation failure', async () => {
    mockSearchPatents.mockRejectedValue(new Error('fetch failed'));
    await handler({ flags: { apiKey: 'maybe-key' } });
    const output = stderrOutput.join('');
    expect(output).toContain('Warning');
    expect(output).toContain('Could not reach');
    expect(mockSetSecret).toHaveBeenCalledWith('SERPAPI_API_KEY', 'maybe-key');
  });

  it('sanitizes API key input', async () => {
    await handler({
      flags: { apiKey: '  spaced-key  ', skipValidation: true },
    });
    expect(mockSanitizeCredential).toHaveBeenCalledWith('  spaced-key  ');
    expect(mockSetSecret).toHaveBeenCalledWith('SERPAPI_API_KEY', 'spaced-key');
  });

  it('throws when keychain is unavailable', async () => {
    mockSetSecret.mockRejectedValue(new Error('keychain unavailable'));
    await expect(
      handler({ flags: { apiKey: 'good-key', skipValidation: true } })
    ).rejects.toThrow('OS keychain not available');
  });
});
