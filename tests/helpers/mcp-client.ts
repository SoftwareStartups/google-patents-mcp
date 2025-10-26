/**
 * Helper utilities for creating and managing MCP test clients
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface McpTestClient {
  client: Client;
  transport: StdioClientTransport;
}

export async function createMcpTestClient(): Promise<McpTestClient> {
  const serverPath = path.resolve(__dirname, '../../build/index.js');

  const client = new Client(
    {
      name: 'google-patents-test-client',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env: {
      ...process.env,
      SERPAPI_API_KEY: process.env.SERPAPI_API_KEY || 'test_api_key',
      ...(process.env.SERPAPI_BASE_URL && {
        SERPAPI_BASE_URL: process.env.SERPAPI_BASE_URL,
      }),
      LOG_LEVEL: process.env.LOG_LEVEL || 'error', // Suppress logs during tests unless overridden
    },
  });

  await client.connect(transport);

  return { client, transport };
}

export async function closeMcpTestClient(
  testClient: McpTestClient
): Promise<void> {
  try {
    await testClient.client.close();
  } catch (error) {
    // Ignore errors during cleanup
  }
}
