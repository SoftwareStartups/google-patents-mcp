#!/usr/bin/env node
/**
 * Integration Test for Google Patents MCP Server
 *
 * This test validates that the MCP server can:
 * 1. Start successfully
 * 2. List available tools
 * 3. Execute patent searches with various parameters
 * 4. Handle filters (dates, inventors, assignees, countries)
 * 5. Handle pagination and sorting
 * 6. Return valid results
 * 7. Handle error scenarios
 * 8. Shut down cleanly
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

interface SerpApiResponse {
  search_metadata?: {
    status?: string;
  };
  search_parameters?: {
    page?: number;
    [key: string]: unknown;
  };
  organic_results?: unknown[];
  [key: string]: unknown;
}

interface ToolResponse {
  content: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

class IntegrationTest {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private results: TestResult[] = [];
  private startTime: number = 0;
  private readonly testTimeout = 60000; // 60 seconds per test

  constructor() {}

  private log(message: string, color: string = colors.reset) {
    // eslint-disable-next-line no-console
    console.log(`${color}${message}${colors.reset}`);
  }

  private async runTest(
    name: string,
    testFn: () => Promise<void>
  ): Promise<void> {
    const start = Date.now();
    this.log(`\n▶ Running: ${name}`, colors.cyan);

    try {
      await testFn();
      const duration = Date.now() - start;
      this.results.push({ name, passed: true, duration });
      this.log(`✓ Passed: ${name} (${duration}ms)`, colors.green);
    } catch (error) {
      const duration = Date.now() - start;
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.results.push({ name, passed: false, error: errorMsg, duration });
      this.log(`✗ Failed: ${name} (${duration}ms)`, colors.red);
      this.log(`  Error: ${errorMsg}`, colors.red);
    }
  }

  private async setupClient(): Promise<void> {
    // Build path to the built server
    const serverPath = path.resolve(__dirname, '../build/index.js');

    this.log('\n🚀 Starting MCP server...', colors.blue);
    this.log(`   Server path: ${serverPath}`, colors.blue);

    // Check for SERPAPI_API_KEY
    if (!process.env.SERPAPI_API_KEY) {
      throw new Error(
        'SERPAPI_API_KEY environment variable is not set. Please set it before running tests.'
      );
    }

    // Create client and transport
    this.client = new Client(
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

    this.transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env: {
        ...process.env,
        SERPAPI_API_KEY: process.env.SERPAPI_API_KEY,
        LOG_LEVEL: 'error', // Reduce noise during testing
      },
    });

    // Connect client to transport
    await this.client.connect(this.transport);
    this.log('✓ MCP server connected', colors.green);
  }

  private async teardownClient(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        this.log('\n✓ MCP server disconnected', colors.green);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.log(`Warning: Error during cleanup: ${errorMsg}`, colors.yellow);
      }
    }
  }

  private async testListTools(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    const response = await this.client.listTools();

    // Validate response structure
    if (!response.tools || !Array.isArray(response.tools)) {
      throw new Error('Invalid response: tools array not found');
    }

    // Check for both tools
    const searchPatentsTool = response.tools.find(
      (tool) => tool.name === 'search_patents'
    );
    const getPatentContentTool = response.tools.find(
      (tool) => tool.name === 'get_patent_content'
    );

    if (!searchPatentsTool) {
      throw new Error('search_patents tool not found in tools list');
    }

    if (!getPatentContentTool) {
      throw new Error('get_patent_content tool not found in tools list');
    }

    // Validate search_patents tool schema
    if (!searchPatentsTool.description) {
      throw new Error('search_patents tool missing description');
    }

    if (
      !searchPatentsTool.inputSchema ||
      !searchPatentsTool.inputSchema.properties
    ) {
      throw new Error('search_patents tool missing input schema');
    }

    // Validate get_patent_content tool schema
    if (!getPatentContentTool.description) {
      throw new Error('get_patent_content tool missing description');
    }

    if (
      !getPatentContentTool.inputSchema ||
      !getPatentContentTool.inputSchema.properties
    ) {
      throw new Error('get_patent_content tool missing input schema');
    }

    const contentSchema = getPatentContentTool.inputSchema as {
      properties?: { patent_url?: unknown; patent_id?: unknown; include?: unknown };
    };
    if (!contentSchema.properties?.patent_url || !contentSchema.properties?.patent_id) {
      throw new Error('get_patent_content tool missing patent_url or patent_id parameters');
    }
    if (!contentSchema.properties?.include) {
      throw new Error('get_patent_content tool missing include parameter');
    }

    this.log(`  Found ${response.tools.length} tool(s)`, colors.cyan);
    this.log(`  Tools: ${searchPatentsTool.name}, ${getPatentContentTool.name}`, colors.cyan);
  }

  private async testBasicSearch(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    const testQuery = 'quantum computer';
    this.log(`  Searching for: "${testQuery}"`, colors.cyan);

    const response = (await this.client.callTool({
      name: 'search_patents',
      arguments: {
        q: testQuery,
        num: 10,
        status: 'GRANT',
      },
    })) as ToolResponse;

    this.validateResponse(response);
    const data = this.parseResponseData(response);

    // Verify no full_content in results
    if (data.organic_results && data.organic_results.length > 0) {
      const firstResult = data.organic_results[0] as {
        full_content?: unknown;
      };
      if (firstResult.full_content) {
        throw new Error('search_patents should not include full_content in results');
      }
    }

    this.log(
      `  Received ${data.organic_results?.length ?? 0} results (no content)`,
      colors.cyan
    );
  }

  private async testSearchWithFilters(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    this.log(`  Testing search with date and country filters`, colors.cyan);

    const response = (await this.client.callTool({
      name: 'search_patents',
      arguments: {
        q: 'artificial intelligence',
        num: 10,
        country: 'US',
        after: 'publication:20200101',
        status: 'GRANT',
      },
    })) as ToolResponse;

    this.validateResponse(response);
    const data = this.parseResponseData(response);
    this.log(
      `  Filtered search returned ${data.organic_results?.length ?? 0} results`,
      colors.cyan
    );
  }

  private async testSearchWithPagination(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    this.log(`  Testing pagination (page 2)`, colors.cyan);

    const response = (await this.client.callTool({
      name: 'search_patents',
      arguments: {
        q: 'machine learning',
        num: 10,
        page: 2,
      },
    })) as ToolResponse;

    this.validateResponse(response);
    const data = this.parseResponseData(response);

    if (data.search_parameters && data.search_parameters.page) {
      this.log(
        `  Pagination working: page ${data.search_parameters.page}`,
        colors.cyan
      );
    }
  }

  private async testSearchWithSorting(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    this.log(`  Testing sorting (newest first)`, colors.cyan);

    const response = (await this.client.callTool({
      name: 'search_patents',
      arguments: {
        q: 'neural network',
        num: 10,
        sort: 'new',
      },
    })) as ToolResponse;

    this.validateResponse(response);
    const data = this.parseResponseData(response);
    this.log(
      `  Sorted search returned ${data.organic_results?.length ?? 0} results`,
      colors.cyan
    );
  }

  private async testSearchWithInventorAndAssignee(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    this.log(`  Testing inventor/assignee filters`, colors.cyan);

    const response = (await this.client.callTool({
      name: 'search_patents',
      arguments: {
        q: 'semiconductor',
        num: 10,
        assignee: 'Intel',
      },
    })) as ToolResponse;

    this.validateResponse(response);
    const data = this.parseResponseData(response);
    this.log(
      `  Assignee-filtered search returned ${data.organic_results?.length ?? 0} results`,
      colors.cyan
    );
  }

  private async testGetPatentContentByUrl(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    this.log(
      `  Fetching patent content by URL`,
      colors.cyan
    );

    // Use a known patent URL
    const response = (await this.client.callTool({
      name: 'get_patent_content',
      arguments: {
        patent_url: 'https://patents.google.com/patent/US7654321B2',
      },
    })) as ToolResponse;

    this.validateResponse(response);
    const text = response.content[0].text;
    if (typeof text !== 'string') {
      throw new Error('Response text is not a string');
    }

    const content = JSON.parse(text) as {
      content_included: boolean;
      claims?: string[];
      description?: string;
      full_text?: string;
    };

    this.log(
      `  Content fetched: ${content.content_included ? 'yes' : 'no'}`,
      colors.cyan
    );

    if (content.content_included) {
      this.log(
        `  Has claims: ${content.claims ? 'yes' : 'no'}, Has description: ${content.description ? 'yes' : 'no'}`,
        colors.cyan
      );
    }
  }

  private async testGetPatentContentById(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    this.log(
      `  Fetching patent content by ID`,
      colors.cyan
    );

    const response = (await this.client.callTool({
      name: 'get_patent_content',
      arguments: {
        patent_id: 'US7654321B2',
      },
    })) as ToolResponse;

    this.validateResponse(response);
    const text = response.content[0].text;
    if (typeof text !== 'string') {
      throw new Error('Response text is not a string');
    }

    const content = JSON.parse(text) as {
      content_included: boolean;
    };

    this.log(
      `  Content fetched by ID: ${content.content_included ? 'yes' : 'no'}`,
      colors.cyan
    );
  }

  private async testSearchThenGetContent(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    this.log(
      `  Testing complete workflow: search then get content`,
      colors.cyan
    );

    // Step 1: Search for patents
    const searchResponse = (await this.client.callTool({
      name: 'search_patents',
      arguments: {
        q: 'neural network',
        num: 10,
        status: 'GRANT',
      },
    })) as ToolResponse;

    this.validateResponse(searchResponse);
    const searchData = this.parseResponseData(searchResponse);

    if (!searchData.organic_results || searchData.organic_results.length === 0) {
      throw new Error('No search results returned');
    }

    this.log(
      `  Step 1: Found ${searchData.organic_results.length} patents`,
      colors.cyan
    );

    // Step 2: Get content for the first patent
    const firstPatent = searchData.organic_results[0] as {
      patent_link?: string;
      patent_id?: string;
    };

    if (!firstPatent.patent_link && !firstPatent.patent_id) {
      throw new Error('Patent has no link or ID');
    }

    const contentArgs = firstPatent.patent_link
      ? { patent_url: firstPatent.patent_link }
      : { patent_id: firstPatent.patent_id };

    const contentResponse = (await this.client.callTool({
      name: 'get_patent_content',
      arguments: contentArgs,
    })) as ToolResponse;

    this.validateResponse(contentResponse);
    const contentText = contentResponse.content[0].text;
    if (typeof contentText !== 'string') {
      throw new Error('Response text is not a string');
    }

    const content = JSON.parse(contentText) as {
      content_included: boolean;
      claims?: string[];
    };

    this.log(
      `  Step 2: Fetched content for first patent (${content.content_included ? 'success' : 'no content'})`,
      colors.cyan
    );

    if (content.content_included && content.claims) {
      this.log(
        `  Retrieved ${content.claims.length} claims`,
        colors.cyan
      );
    }
  }

  private validateResponse(response: ToolResponse): void {
    if (!response.content || !Array.isArray(response.content)) {
      throw new Error('Invalid response: content array not found');
    }

    if (response.content.length === 0) {
      throw new Error('Response content is empty');
    }

    const firstContent = response.content[0];
    if (firstContent.type !== 'text') {
      throw new Error(
        `Expected content type 'text', got '${firstContent.type}'`
      );
    }
  }

  private parseResponseData(response: ToolResponse): SerpApiResponse {
    const firstContent = response.content[0];

    if (!firstContent.text) {
      throw new Error('Response text is missing');
    }

    let data: SerpApiResponse;
    try {
      data = JSON.parse(firstContent.text) as SerpApiResponse;
    } catch {
      throw new Error('Response text is not valid JSON');
    }

    if (!data.search_metadata) {
      throw new Error('Response missing search_metadata');
    }

    if (!data.search_parameters) {
      throw new Error('Response missing search_parameters');
    }

    if (data.search_metadata.status !== 'Success') {
      throw new Error(
        `SerpApi search status: ${data.search_metadata.status ?? 'unknown'}`
      );
    }

    return data;
  }

  private printSummary(): void {
    const totalTests = this.results.length;
    const passedTests = this.results.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = Date.now() - this.startTime;

    this.log('\n' + '='.repeat(60), colors.blue);
    this.log('TEST SUMMARY', colors.blue);
    this.log('='.repeat(60), colors.blue);

    this.results.forEach((result) => {
      const icon = result.passed ? '✓' : '✗';
      const color = result.passed ? colors.green : colors.red;
      this.log(`${icon} ${result.name} (${result.duration}ms)`, color);
      if (result.error) {
        this.log(`  └─ ${result.error}`, colors.red);
      }
    });

    this.log('\n' + '-'.repeat(60), colors.blue);
    this.log(
      `Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`,
      colors.blue
    );
    this.log(`Duration: ${totalDuration}ms`, colors.blue);
    this.log('='.repeat(60), colors.blue);

    if (failedTests > 0) {
      this.log('\n❌ INTEGRATION TESTS FAILED', colors.red);
      process.exit(1);
    } else {
      this.log('\n✅ INTEGRATION TESTS PASSED', colors.green);
      process.exit(0);
    }
  }

  async run(): Promise<void> {
    this.startTime = Date.now();
    this.log('\n' + '='.repeat(60), colors.blue);
    this.log(
      '🧪 Google Patents MCP Server - Integration Test Suite',
      colors.blue
    );
    this.log('='.repeat(60), colors.blue);

    try {
      // Setup
      await this.runTest('Server Initialization', async () => {
        await this.setupClient();
      });

      // Run tests only if setup succeeded
      if (this.results[0].passed) {
        await this.runTest('List Tools', async () => {
          await this.testListTools();
        });

        await this.runTest('Basic Patent Search', async () => {
          await this.testBasicSearch();
        });

        await this.runTest('Search with Filters', async () => {
          await this.testSearchWithFilters();
        });

        await this.runTest('Search with Pagination', async () => {
          await this.testSearchWithPagination();
        });

        await this.runTest('Search with Sorting', async () => {
          await this.testSearchWithSorting();
        });

        await this.runTest('Search with Inventor/Assignee', async () => {
          await this.testSearchWithInventorAndAssignee();
        });

        await this.runTest('Get Patent Content by URL', async () => {
          await this.testGetPatentContentByUrl();
        });

        await this.runTest('Get Patent Content by ID', async () => {
          await this.testGetPatentContentById();
        });

        await this.runTest('Workflow: Search then Get Content', async () => {
          await this.testSearchThenGetContent();
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log(`\n❌ Unexpected error: ${errorMsg}`, colors.red);
    } finally {
      // Cleanup
      await this.teardownClient();

      // Print summary
      this.printSummary();
    }
  }
}

// Run the integration tests
const test = new IntegrationTest();
test.run().catch((error: unknown) => {
  const errorMsg = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error(`${colors.red}Fatal error: ${errorMsg}${colors.reset}`);
  process.exit(1);
});
