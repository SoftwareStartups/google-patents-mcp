/**
 * Common test utilities and helper functions
 */

import { type Mock, mock } from 'bun:test';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Logger } from '../../src/logger.js';
import type { PatentService } from '../../src/services/patent.js';
import type { SerpApiClient } from '../../src/services/serpapi.js';

export type MockLogger = {
  [K in keyof Logger]: Mock<Logger[K]>;
};

export function createMockLogger(): MockLogger {
  return {
    info: mock(),
    warn: mock(),
    error: mock(),
    debug: mock(),
  };
}

export interface MockSerpApiOverrides {
  searchPatents?: Mock<SerpApiClient['searchPatents']>;
  getPatentDetails?: Mock<SerpApiClient['getPatentDetails']>;
}

export function createMockSerpApiClient(
  overrides: MockSerpApiOverrides = {}
): SerpApiClient {
  return {
    searchPatents: overrides.searchPatents ?? mock(),
    getPatentDetails: overrides.getPatentDetails ?? mock(),
  } as unknown as SerpApiClient;
}

export interface MockPatentServiceOverrides {
  fetchPatentData?: Mock<PatentService['fetchPatentData']>;
}

export function createMockPatentService(
  overrides: MockPatentServiceOverrides = {}
): PatentService {
  return {
    fetchPatentData: overrides.fetchPatentData ?? mock(),
  } as unknown as PatentService;
}

// parseToolResponse performs runtime JSON validation before returning
export function parseToolResponse<T = unknown>(response: CallToolResult): T {
  if (!response.content || !Array.isArray(response.content)) {
    throw new Error('Invalid response: content array not found');
  }

  if (response.content.length === 0) {
    throw new Error('Response content is empty');
  }

  const firstContent = response.content[0];
  if (firstContent.type !== 'text') {
    throw new Error(`Expected content type 'text', got '${firstContent.type}'`);
  }

  if (!('text' in firstContent) || typeof firstContent.text !== 'string') {
    throw new Error('Response text is missing or not a string');
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsed = JSON.parse(firstContent.text);
    // Type assertion is safe here because we validate the structure before parsing
    // and the generic T is provided by the caller based on expected structure
    return parsed as T;
  } catch {
    throw new Error('Response text is not valid JSON');
  }
}
