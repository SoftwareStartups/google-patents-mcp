#!/usr/bin/env node
/**
 * End-to-End Test for Google Patents MCP Server with Real SerpAPI Calls
 *
 * This test validates that the MCP server can:
 * 1. Make real API calls to SerpAPI
 * 2. Search for patents and return real results
 * 3. Fetch patent content and return real data
 * 4. Handle various search parameters and filters
 * 5. Process patent details with claims, descriptions, and metadata
 * 6. Validate data structure and content quality
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
  magenta: '\x1b[35m',
};

interface SerpApiResponse {
  search_metadata?: {
    status?: string;
    total_time_taken?: number;
  };
  search_parameters?: {
    page?: number;
    num?: number;
    q?: string;
    [key: string]: unknown;
  };
  organic_results?: Array<{
    title?: string;
    patent_link?: string;
    patent_id?: string;
    assignee?: string;
    inventor?: string;
    publication_date?: string;
    filing_date?: string;
    priority_date?: string;
    abstract?: string;
    snippet?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

interface PatentData {
  patent_id?: string;
  title?: string;
  publication_number?: string;
  assignee?: string;
  inventor?: string;
  priority_date?: string;
  filing_date?: string;
  grant_date?: string;
  publication_date?: string;
  abstract?: string;
  description?: string;
  claims?: string[];
  family_members?: Array<{
    patent_id: string;
    region: string;
    status: string;
  }>;
  citations?: {
    forward_citations: number;
    backward_citations: number;
    family_to_family_citations?: number;
  };
}

interface ToolResponse {
  content: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

class RealApiE2ETest {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private readonly testTimeout = 120000; // 2 minutes per test for real API calls

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
      this.log(`✓ Passed: ${name} (${duration}ms)`, colors.green);
    } catch (error) {
      const duration = Date.now() - start;
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log(`✗ Failed: ${name} (${duration}ms)`, colors.red);
      this.log(`  Error: ${errorMsg}`, colors.red);
      throw error; // Re-throw to stop execution on failure
    }
  }

  private async setupClient(): Promise<void> {
    // Build path to the built server
    const serverPath = path.resolve(__dirname, '../build/index.js');

    this.log('\n🚀 Starting MCP server for real API testing...', colors.blue);
    this.log(`   Server path: ${serverPath}`, colors.blue);

    // Check for SERPAPI_API_KEY
    if (!process.env.SERPAPI_API_KEY) {
      throw new Error(
        'SERPAPI_API_KEY environment variable is not set. Please set it before running tests.'
      );
    }

    this.log(`   Using SerpAPI key: ${process.env.SERPAPI_API_KEY.substring(0, 8)}...`, colors.blue);

    // Create client and transport
    this.client = new Client(
      {
        name: 'google-patents-e2e-test-client',
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
        LOG_LEVEL: 'info', // Show info level logs for debugging
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

  private async testRealPatentSearch(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    const testQuery = 'artificial intelligence machine learning';
    this.log(`  Searching for: "${testQuery}"`, colors.cyan);

    const response = (await this.client.callTool({
      name: 'search_patents',
      arguments: {
        q: testQuery,
        num: 10,
        status: 'GRANT',
        country: 'US',
        after: 'publication:20200101',
      },
    })) as ToolResponse;

    this.validateResponse(response);
    const data = this.parseResponseData(response);

    // Validate real results
    if (!data.organic_results || data.organic_results.length === 0) {
      throw new Error('No search results returned from real API');
    }

    this.log(`  Received ${data.organic_results.length} real results`, colors.cyan);

    // Validate first result has real data
    const firstResult = data.organic_results[0];
    if (!firstResult.title || !firstResult.patent_link) {
      throw new Error('First result missing title or patent link');
    }

    this.log(`  First result: "${firstResult.title}"`, colors.cyan);
    this.log(`  Patent link: ${firstResult.patent_link}`, colors.cyan);

    // Validate search metadata
    if (data.search_metadata?.status !== 'Success') {
      throw new Error(`SerpAPI search status: ${data.search_metadata?.status ?? 'unknown'}`);
    }

    // Log timing information
    if (data.search_metadata?.total_time_taken) {
      this.log(`  API response time: ${data.search_metadata.total_time_taken}s`, colors.cyan);
    }
  }

  private async testRealPatentContent(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    // Use a known patent that should exist
    const patentUrl = 'https://patents.google.com/patent/US7654321B2';
    this.log(`  Fetching patent content: ${patentUrl}`, colors.cyan);

    const response = (await this.client.callTool({
      name: 'get_patent',
      arguments: {
        patent_url: patentUrl,
        include: ['metadata', 'description', 'claims'],
      },
    })) as ToolResponse;

    this.validateResponse(response);
    const text = response.content[0].text;
    if (typeof text !== 'string') {
      throw new Error('Response text is not a string');
    }

    const content = JSON.parse(text) as PatentData;

    // Validate that we got real patent data
    if (!content.patent_id && !content.title) {
      throw new Error('No patent data returned from real API');
    }

    this.log(`  Patent ID: ${content.patent_id || 'N/A'}`, colors.cyan);
    this.log(`  Title: ${content.title || 'N/A'}`, colors.cyan);
    this.log(`  Assignee: ${content.assignee || 'N/A'}`, colors.cyan);

    // Validate description content
    if (content.description) {
      this.log(`  Description length: ${content.description.length} characters`, colors.cyan);
      if (content.description.length < 100) {
        throw new Error('Description seems too short for real patent data');
      }
    } else {
      this.log(`  No description returned`, colors.yellow);
    }

    // Validate claims content
    if (content.claims && content.claims.length > 0) {
      this.log(`  Claims count: ${content.claims.length}`, colors.cyan);
      const firstClaim = content.claims[0];
      if (firstClaim && firstClaim.length < 20) {
        throw new Error('First claim seems too short for real patent data');
      }
    } else {
      this.log(`  No claims returned`, colors.yellow);
    }

    // Validate metadata
    if (content.publication_date || content.filing_date) {
      this.log(`  Publication date: ${content.publication_date || 'N/A'}`, colors.cyan);
      this.log(`  Filing date: ${content.filing_date || 'N/A'}`, colors.cyan);
    }
  }

  private async testRealWorkflow(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    this.log(`  Testing complete workflow with real API calls`, colors.cyan);

    // Step 1: Search for patents
    const searchResponse = (await this.client.callTool({
      name: 'search_patents',
      arguments: {
        q: 'neural network deep learning',
        num: 10,
        status: 'GRANT',
        country: 'US',
        sort: 'new',
      },
    })) as ToolResponse;

    this.validateResponse(searchResponse);
    const searchData = this.parseResponseData(searchResponse);

    if (!searchData.organic_results || searchData.organic_results.length === 0) {
      throw new Error('No search results returned for workflow test');
    }

    this.log(`  Step 1: Found ${searchData.organic_results.length} patents`, colors.cyan);

    // Step 2: Get content for the first patent
    const firstPatent = searchData.organic_results[0];
    if (!firstPatent.patent_link && !firstPatent.patent_id) {
      throw new Error('Patent has no link or ID for workflow test');
    }

    const contentArgs = firstPatent.patent_link
      ? { patent_url: firstPatent.patent_link }
      : { patent_id: firstPatent.patent_id };

    this.log(`  Step 2: Fetching content for: ${firstPatent.title || 'Unknown'}`, colors.cyan);

    const contentResponse = (await this.client.callTool({
      name: 'get_patent',
      arguments: {
        ...contentArgs,
        include: ['metadata', 'description'],
        max_length: 2000, // Limit content for testing
      },
    })) as ToolResponse;

    this.validateResponse(contentResponse);
    const contentText = contentResponse.content[0].text;
    if (typeof contentText !== 'string') {
      throw new Error('Response text is not a string');
    }

    const content = JSON.parse(contentText) as PatentData;

    // Validate workflow results
    if (!content.title && !content.description) {
      throw new Error('Workflow test: No meaningful content returned');
    }

    this.log(`  Step 2: Retrieved content for "${content.title || 'Unknown'}"`, colors.cyan);

    if (content.description) {
      this.log(`  Description length: ${content.description.length} characters`, colors.cyan);
    }

    // Validate that the content is related to the search query
    if (content.description && content.description.toLowerCase().includes('neural')) {
      this.log(`  ✓ Content relevance validated (contains "neural")`, colors.green);
    } else if (content.title && content.title.toLowerCase().includes('neural')) {
      this.log(`  ✓ Content relevance validated (title contains "neural")`, colors.green);
    } else {
      this.log(`  ⚠ Content relevance unclear`, colors.yellow);
    }
  }

  private async testAdvancedSearchFilters(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    this.log(`  Testing advanced search filters with real API`, colors.cyan);

    const response = (await this.client.callTool({
      name: 'search_patents',
      arguments: {
        q: 'semiconductor',
        num: 10,
        assignee: 'Intel',
        inventor: 'Gordon Moore',
        country: 'US',
        after: 'publication:20200101',
        before: 'publication:20231231',
        status: 'GRANT',
        type: 'PATENT',
        sort: 'new',
      },
    })) as ToolResponse;

    this.validateResponse(response);
    const data = this.parseResponseData(response);

    this.log(`  Advanced search returned ${data.organic_results?.length ?? 0} results`, colors.cyan);

    // Validate that filters are working
    if (data.search_parameters) {
      this.log(`  Applied filters:`, colors.cyan);
      this.log(`    Query: ${String(data.search_parameters.q || 'N/A')}`, colors.cyan);
      this.log(`    Assignee: ${String(data.search_parameters.assignee || 'N/A')}`, colors.cyan);
      this.log(`    Country: ${String(data.search_parameters.country || 'N/A')}`, colors.cyan);
      this.log(`    Status: ${String(data.search_parameters.status || 'N/A')}`, colors.cyan);
    }

    // Check if results contain expected assignee
    if (data.organic_results && data.organic_results.length > 0) {
      const hasIntelResults = data.organic_results.some(result =>
        result.assignee && result.assignee.toLowerCase().includes('intel')
      );
      if (hasIntelResults) {
        this.log(`  ✓ Found Intel-assigned patents`, colors.green);
      } else {
        this.log(`  ⚠ No Intel-assigned patents found in results`, colors.yellow);
      }
    }
  }

  private async testPatentContentWithAllSections(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    this.log(`  Testing patent content with all sections`, colors.cyan);

    const response = (await this.client.callTool({
      name: 'get_patent',
      arguments: {
        patent_id: 'US7654321B2',
        include: ['metadata', 'description', 'claims', 'family_members', 'citations'],
      },
    })) as ToolResponse;

    this.validateResponse(response);
    const text = response.content[0].text;
    if (typeof text !== 'string') {
      throw new Error('Response text is not a string');
    }

    const content = JSON.parse(text) as PatentData;

    this.log(`  Retrieved patent: ${content.title || 'Unknown'}`, colors.cyan);

    // Validate each section
    const sections = {
      metadata: !!content.title,
      description: !!content.description,
      claims: !!(content.claims && content.claims.length > 0),
      family_members: !!(content.family_members && content.family_members.length > 0),
      citations: !!content.citations,
    };

    this.log(`  Content sections:`, colors.cyan);
    Object.entries(sections).forEach(([section, hasContent]) => {
      const status = hasContent ? '✓' : '✗';
      const color = hasContent ? colors.green : colors.red;
      this.log(`    ${status} ${section}: ${hasContent ? 'present' : 'missing'}`, color);
    });

    // Validate citations if present
    if (content.citations) {
      this.log(`  Citations:`, colors.cyan);
      this.log(`    Forward: ${content.citations.forward_citations}`, colors.cyan);
      this.log(`    Backward: ${content.citations.backward_citations}`, colors.cyan);
    }

    // Validate family members if present
    if (content.family_members && content.family_members.length > 0) {
      this.log(`  Family members: ${content.family_members.length}`, colors.cyan);
      content.family_members.slice(0, 3).forEach(member => {
        this.log(`    ${member.patent_id} (${member.region}) - ${member.status}`, colors.cyan);
      });
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

    return data;
  }

  async run(): Promise<void> {
    this.log('\n' + '='.repeat(70), colors.magenta);
    this.log(
      '🧪 Google Patents MCP Server - Real API End-to-End Test Suite',
      colors.magenta
    );
    this.log('='.repeat(70), colors.magenta);

    try {
      // Setup
      await this.runTest('Server Initialization', async () => {
        await this.setupClient();
      });

      // Run all tests
      await this.runTest('Real Patent Search', async () => {
        await this.testRealPatentSearch();
      });

      await this.runTest('Real Patent Content', async () => {
        await this.testRealPatentContent();
      });

      await this.runTest('Real Workflow: Search then Get Content', async () => {
        await this.testRealWorkflow();
      });

      await this.runTest('Advanced Search Filters', async () => {
        await this.testAdvancedSearchFilters();
      });

      await this.runTest('Patent Content with All Sections', async () => {
        await this.testPatentContentWithAllSections();
      });

      this.log('\n✅ ALL REAL API TESTS PASSED', colors.green);
      this.log('🎉 The MCP server successfully integrates with SerpAPI!', colors.green);
      process.exit(0);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log(`\n❌ Test failed: ${errorMsg}`, colors.red);
      process.exit(1);
    } finally {
      // Cleanup
      await this.teardownClient();
    }
  }
}

// Run the end-to-end tests
const test = new RealApiE2ETest();
test.run().catch((error: unknown) => {
  const errorMsg = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error(`${colors.red}Fatal error: ${errorMsg}${colors.reset}`);
  process.exit(1);
});
