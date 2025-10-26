/**
 * Common test utilities and helper functions
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export function parseToolResponse<T>(response: CallToolResult): T {
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
    return JSON.parse(firstContent.text) as T;
  } catch {
    throw new Error('Response text is not valid JSON');
  }
}

export function expectValidToolResponse(response: CallToolResult): void {
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
}
