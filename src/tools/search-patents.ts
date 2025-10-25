import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import winston from 'winston';
import type { SerpApiClient } from '../services/serpapi.js';
import type { SearchPatentsArgs } from '../types.js';
import type { ToolDefinition } from './types.js';

export const searchPatentsToolDefinition: Tool = {
  name: 'search_patents',
  description:
    'Searches Google Patents using SerpApi. Returns patent metadata including title, publication number, assignee, inventor, dates, and links. Allows filtering by date, inventor, assignee, country, language, status, type, and sorting. Use get_patent_content to fetch full patent text for specific patents.',
  inputSchema: {
    type: 'object',
    properties: {
      q: {
        type: 'string',
        description:
          "Search query (optional). Use semicolon (;) to separate multiple terms. Advanced syntax like '(Coffee) OR (Tea);(A47J)' is supported. If not provided, will search using other filters (assignee, inventor, etc.). See 'About Google Patents' for details.",
      },
      page: {
        type: 'integer',
        description: 'Page number for pagination (default: 1).',
        default: 1,
      },
      num: {
        type: 'integer',
        description:
          'Number of results per page (default: 10). **IMPORTANT: Must be 10 or greater (up to 100).**',
        default: 10,
        minimum: 10,
        maximum: 100,
      },
      sort: {
        type: 'string',
        enum: ['relevance', 'new', 'old'],
        description:
          "Sorting method. 'relevance' (default), 'new' (newest by filing/publication date), 'old' (oldest by filing/publication date).",
        default: 'relevance',
      },
      before: {
        type: 'string',
        description:
          "Maximum date filter (e.g., 'publication:20231231', 'filing:20220101'). Format: type:YYYYMMDD where type is 'priority', 'filing', or 'publication'.",
      },
      after: {
        type: 'string',
        description:
          "Minimum date filter (e.g., 'publication:20230101', 'filing:20220601'). Format: type:YYYYMMDD where type is 'priority', 'filing', or 'publication'.",
      },
      inventor: {
        type: 'string',
        description:
          'Filter by inventor names. Separate multiple names with a comma (,).',
      },
      assignee: {
        type: 'string',
        description:
          'Filter by assignee names. Separate multiple names with a comma (,).',
      },
      country: {
        type: 'string',
        description:
          "Filter by country codes (e.g., 'US', 'WO,JP'). Separate multiple codes with a comma (,).",
      },
      language: {
        type: 'string',
        description:
          "Filter by language (e.g., 'ENGLISH', 'JAPANESE,GERMAN'). Separate multiple languages with a comma (,). Supported: ENGLISH, GERMAN, CHINESE, FRENCH, SPANISH, ARABIC, JAPANESE, KOREAN, PORTUGUESE, RUSSIAN, ITALIAN, DUTCH, SWEDISH, FINNISH, NORWEGIAN, DANISH.",
      },
      status: {
        type: 'string',
        enum: ['GRANT', 'APPLICATION'],
        description: "Filter by patent status: 'GRANT' or 'APPLICATION'.",
      },
      type: {
        type: 'string',
        enum: ['PATENT', 'DESIGN'],
        description: "Filter by patent type: 'PATENT' or 'DESIGN'.",
      },
      scholar: {
        type: 'boolean',
        description: 'Include Google Scholar results (default: false).',
        default: false,
      },
    },
    required: [],
  },
};

export function createSearchPatentsTool(
  serpApiClient: SerpApiClient,
  logger: winston.Logger
): ToolDefinition {
  return {
    definition: searchPatentsToolDefinition,
    handler: async (args: unknown): Promise<CallToolResult> => {
      try {
        const data = await serpApiClient.searchPatents(
          args as SearchPatentsArgs
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(data, null, 2) },
          ],
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`Error in search_patents handler: ${errorMessage}`);
        throw error;
      }
    },
  };
}

