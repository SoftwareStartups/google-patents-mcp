#!/usr/bin/env node
/**
 * Smoke Integration Test for Google Patents MCP Server
 * 
 * This test validates that the MCP server can:
 * 1. Start successfully
 * 2. List available tools
 * 3. Execute a patent search
 * 4. Return valid results
 * 5. Shut down cleanly
 */

import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

class SmokeTest {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor() {}

  private log(message: string, color: string = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
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
      throw new Error('SERPAPI_API_KEY environment variable is not set. Please set it before running tests.');
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
        this.log(`Warning: Error during cleanup: ${error}`, colors.yellow);
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

    // Check for search_patents tool
    const searchPatentsTool = response.tools.find(tool => tool.name === 'search_patents');
    if (!searchPatentsTool) {
      throw new Error('search_patents tool not found in tools list');
    }

    // Validate tool schema
    if (!searchPatentsTool.description) {
      throw new Error('search_patents tool missing description');
    }

    if (!searchPatentsTool.inputSchema || !searchPatentsTool.inputSchema.properties) {
      throw new Error('search_patents tool missing input schema');
    }

    // Check for required 'q' parameter
    const schema = searchPatentsTool.inputSchema as any;
    if (!schema.properties.q) {
      throw new Error('search_patents tool missing required "q" parameter');
    }

    this.log(`  Found ${response.tools.length} tool(s)`, colors.cyan);
    this.log(`  Tool: ${searchPatentsTool.name}`, colors.cyan);
  }

  private async testSearchPatents(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    // Execute a simple patent search
    const testQuery = 'quantum computer';
    this.log(`  Searching for: "${testQuery}"`, colors.cyan);

    const response = await this.client.callTool({
      name: 'search_patents',
      arguments: {
        q: testQuery,
        num: 10, // Minimum required by the API
        status: 'GRANT',
      },
    });

    // Validate response structure
    if (!response.content || !Array.isArray(response.content)) {
      throw new Error('Invalid response: content array not found');
    }

    if (response.content.length === 0) {
      throw new Error('Response content is empty');
    }

    // Check first content item
    const firstContent = response.content[0];
    if (firstContent.type !== 'text') {
      throw new Error(`Expected content type 'text', got '${firstContent.type}'`);
    }

    // Parse the JSON response
    let data: any;
    try {
      data = JSON.parse((firstContent as any).text);
    } catch (error) {
      throw new Error('Response text is not valid JSON');
    }

    // Validate SerpApi response structure
    if (!data.search_metadata) {
      throw new Error('Response missing search_metadata');
    }

    if (!data.search_parameters) {
      throw new Error('Response missing search_parameters');
    }

    // Check if we got results (organic_results might be empty for some queries, which is ok)
    if (data.organic_results && Array.isArray(data.organic_results)) {
      this.log(`  Received ${data.organic_results.length} patent results`, colors.cyan);
      
      // Validate first result structure if available
      if (data.organic_results.length > 0) {
        const firstResult = data.organic_results[0];
        if (!firstResult.title) {
          throw new Error('First result missing title');
        }
        if (!firstResult.patent_id) {
          throw new Error('First result missing patent_id');
        }
        this.log(`  First result: ${firstResult.title} (${firstResult.patent_id})`, colors.cyan);
      }
    } else {
      this.log(`  No organic results (empty result set - this is acceptable)`, colors.yellow);
    }

    // Validate search metadata
    if (data.search_metadata.status !== 'Success') {
      throw new Error(`SerpApi search status: ${data.search_metadata.status}`);
    }

    this.log(`  Search completed successfully`, colors.cyan);
    this.log(`  API processed in: ${data.search_metadata.processed_at}`, colors.cyan);
  }

  private printSummary(): void {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = Date.now() - this.startTime;

    this.log('\n' + '='.repeat(60), colors.blue);
    this.log('TEST SUMMARY', colors.blue);
    this.log('='.repeat(60), colors.blue);

    this.results.forEach(result => {
      const icon = result.passed ? '✓' : '✗';
      const color = result.passed ? colors.green : colors.red;
      this.log(`${icon} ${result.name} (${result.duration}ms)`, color);
      if (result.error) {
        this.log(`  └─ ${result.error}`, colors.red);
      }
    });

    this.log('\n' + '-'.repeat(60), colors.blue);
    this.log(`Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`, colors.blue);
    this.log(`Duration: ${totalDuration}ms`, colors.blue);
    this.log('='.repeat(60), colors.blue);

    if (failedTests > 0) {
      this.log('\n❌ SMOKE TEST FAILED', colors.red);
      process.exit(1);
    } else {
      this.log('\n✅ SMOKE TEST PASSED', colors.green);
      process.exit(0);
    }
  }

  async run(): Promise<void> {
    this.startTime = Date.now();
    this.log('\n' + '='.repeat(60), colors.blue);
    this.log('🧪 Google Patents MCP Server - Smoke Integration Test', colors.blue);
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

        await this.runTest('Search Patents', async () => {
          await this.testSearchPatents();
        });
      }

    } catch (error) {
      this.log(`\n❌ Unexpected error: ${error}`, colors.red);
    } finally {
      // Cleanup
      await this.teardownClient();
      
      // Print summary
      this.printSummary();
    }
  }
}

// Run the smoke test
const test = new SmokeTest();
test.run().catch(error => {
  console.error(`${colors.red}Fatal error: ${error}${colors.reset}`);
  process.exit(1);
});

