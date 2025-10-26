/**
 * End-to-End tests for Google Patents MCP Server (Real SerpAPI)
 *
 * These tests make real API calls to SerpAPI for validation.
 * They can be skipped in CI by excluding the e2e test file.
 */

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PatentData, SerpApiResponse } from '../src/types.js';
import {
  assertHasAbstract,
  assertHasMetadata,
  assertValidPatentData,
  assertValidSearchResponse,
} from './helpers/assertions.js';
import {
  closeMcpTestClient,
  createMcpTestClient,
} from './helpers/mcp-client.js';
import { parseToolResponse } from './helpers/test-utils.js';

// Load environment variables from .env file
dotenv.config();

describe('E2E Tests - MCP Server with Real SerpAPI', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    // Check for API key
    if (!process.env.SERPAPI_API_KEY) {
      throw new Error(
        'SERPAPI_API_KEY environment variable is required for E2E tests'
      );
    }

    const testClient = await createMcpTestClient();
    client = testClient.client;
    transport = testClient.transport;
  }, 30000);

  afterAll(async () => {
    await closeMcpTestClient({ client, transport });
  });

  describe('Real Patent Search', () => {
    it('should search for patents and return real results', async () => {
      const response = (await client.callTool({
        name: 'search_patents',
        arguments: {
          q: 'artificial intelligence machine learning',
          num: 10,
          status: 'GRANT',
          country: 'US',
        },
      })) as CallToolResult;

      const data = parseToolResponse<SerpApiResponse>(response);
      assertValidSearchResponse(data);

      expect(data.organic_results).toBeDefined();
      expect(data.organic_results!.length).toBeGreaterThan(0);

      // Validate first result has real data
      const firstResult = data.organic_results![0];
      expect(firstResult.title).toBeTruthy();
      expect(firstResult.patent_link || firstResult.patent_id).toBeTruthy();
    });

    it('should handle search with filters', async () => {
      const response = (await client.callTool({
        name: 'search_patents',
        arguments: {
          q: 'semiconductor',
          num: 10,
          assignee: 'Intel',
          country: 'US',
          after: 'publication:20200101',
        },
      })) as CallToolResult;

      const data = parseToolResponse<SerpApiResponse>(response);
      assertValidSearchResponse(data);

      expect(data.organic_results).toBeDefined();
    });

    it('should handle pagination', async () => {
      const response = (await client.callTool({
        name: 'search_patents',
        arguments: {
          q: 'neural network',
          num: 10,
          page: 2,
        },
      })) as CallToolResult;

      const data = parseToolResponse<SerpApiResponse>(response);
      assertValidSearchResponse(data);
    });

    it('should handle assignee-only search', async () => {
      const response = (await client.callTool({
        name: 'search_patents',
        arguments: {
          assignee: 'Google',
          num: 10,
        },
      })) as CallToolResult;

      const data = parseToolResponse<SerpApiResponse>(response);
      assertValidSearchResponse(data);
    });
  });

  describe('Real Patent Content', () => {
    it('should fetch patent content by URL', async () => {
      const response = (await client.callTool({
        name: 'get_patent',
        arguments: {
          patent_url: 'https://patents.google.com/patent/US7654321B2',
        },
      })) as CallToolResult;

      const data = parseToolResponse<PatentData>(response);
      assertValidPatentData(data);
      assertHasMetadata(data);
      assertHasAbstract(data);
    });

    it('should fetch patent with description and claims', async () => {
      const response = (await client.callTool({
        name: 'get_patent',
        arguments: {
          patent_id: 'US7654321B2',
          include: ['metadata', 'description', 'claims'],
        },
      })) as CallToolResult;

      const data = parseToolResponse<PatentData>(response);
      assertValidPatentData(data);

      if (data.description) {
        expect(data.description.length).toBeGreaterThan(100);
      }

      if (data.claims) {
        expect(data.claims.length).toBeGreaterThan(0);
      }
    });

    it('should fetch patent with all sections', async () => {
      const response = (await client.callTool({
        name: 'get_patent',
        arguments: {
          patent_id: 'US7654321B2',
          include: [
            'metadata',
            'description',
            'claims',
            'family_members',
            'citations',
          ],
        },
      })) as CallToolResult;

      const data = parseToolResponse<PatentData>(response);
      assertValidPatentData(data);

      // Log what sections we got
      const sections = {
        metadata: !!data.title,
        description: !!data.description,
        claims: !!(data.claims && data.claims.length > 0),
        family_members: !!(
          data.family_members && data.family_members.length > 0
        ),
        citations: !!data.citations,
      };

      // At least some sections should be present
      const presentSections = Object.values(sections).filter(Boolean).length;
      expect(presentSections).toBeGreaterThan(0);
    });

    it('should handle max_length parameter', async () => {
      const response = (await client.callTool({
        name: 'get_patent',
        arguments: {
          patent_id: 'US7654321B2',
          include: ['metadata', 'description'],
          max_length: 2000,
        },
      })) as CallToolResult;

      const data = parseToolResponse<PatentData>(response);
      assertValidPatentData(data);

      if (data.description) {
        expect(data.description.length).toBeLessThanOrEqual(2100); // Small buffer for truncation indicator
      }
    });

    it('should handle abstract retrieval', async () => {
      const response = (await client.callTool({
        name: 'get_patent',
        arguments: {
          patent_id: 'US7654321B2',
          include: ['abstract'],
        },
      })) as CallToolResult;

      const data = parseToolResponse<PatentData>(response);

      expect(data.abstract).toBeDefined();
      expect(data.title).toBeUndefined(); // Metadata not included
    });
  });

  describe('Real Workflow', () => {
    it('should search and then fetch patent content', async () => {
      // Step 1: Search for patents
      const searchResponse = (await client.callTool({
        name: 'search_patents',
        arguments: {
          q: 'neural network deep learning',
          num: 10,
          status: 'GRANT',
          country: 'US',
          sort: 'new',
        },
      })) as CallToolResult;

      const searchData = parseToolResponse<SerpApiResponse>(searchResponse);
      assertValidSearchResponse(searchData);

      expect(searchData.organic_results).toBeDefined();
      expect(searchData.organic_results!.length).toBeGreaterThan(0);

      // Step 2: Get content for first patent
      const firstPatent = searchData.organic_results![0];
      const patentArgs = firstPatent.patent_link
        ? { patent_url: firstPatent.patent_link }
        : { patent_id: firstPatent.patent_id };

      const contentResponse = (await client.callTool({
        name: 'get_patent',
        arguments: {
          ...patentArgs,
          include: ['metadata', 'description'],
          max_length: 2000,
        },
      })) as CallToolResult;

      const patentData = parseToolResponse<PatentData>(contentResponse);
      assertValidPatentData(patentData);
    });
  });

  describe('Advanced Search Filters', () => {
    it('should handle multiple filters', async () => {
      const response = (await client.callTool({
        name: 'search_patents',
        arguments: {
          q: 'semiconductor',
          num: 10,
          assignee: 'Intel',
          country: 'US',
          after: 'publication:20200101',
          before: 'publication:20231231',
          status: 'GRANT',
          type: 'PATENT',
          sort: 'new',
        },
      })) as CallToolResult;

      const data = parseToolResponse<SerpApiResponse>(response);
      assertValidSearchResponse(data);
    });
  });
});
