import {
    ErrorCode,
    McpError,
    type CallToolResult,
    type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import winston from 'winston';
import type { PatentContentService } from '../services/patent-content.js';
import type { GetPatentContentArgs } from '../types.js';
import type { ToolDefinition } from './types.js';

export const getPatentContentToolDefinition: Tool = {
  name: 'get_patent_content',
  description:
    'Fetches full patent content including claims and description from Google Patents. Accepts either a patent URL (from search results) or a patent ID. Returns parsed patent text with claims, description, and full combined text.',
  inputSchema: {
    type: 'object',
    properties: {
      patent_url: {
        type: 'string',
        description:
          'Full Google Patents URL (e.g., "https://patents.google.com/patent/US1234567A"). Takes precedence if both patent_url and patent_id are provided.',
      },
      patent_id: {
        type: 'string',
        description:
          'Patent ID (e.g., "US1234567A" or "patent/US1234567A/en"). Will be converted to a Google Patents URL.',
      },
    },
    required: [],
  },
};

export function createGetPatentContentTool(
  patentContentService: PatentContentService,
  logger: winston.Logger
): ToolDefinition {
  return {
    definition: getPatentContentToolDefinition,
    handler: async (args: unknown): Promise<CallToolResult> => {
      const params = args as GetPatentContentArgs;

      // Validate that at least one parameter is provided
      if (!params.patent_url && !params.patent_id) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Either patent_url or patent_id must be provided'
        );
      }

      try {
        // Use patent_url if provided, otherwise use patent_id
        const urlOrId = params.patent_url || params.patent_id || '';
        const content = await patentContentService.fetchContent(urlOrId);

        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(content, null, 2) },
          ],
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`Error in get_patent_content handler: ${errorMessage}`);
        throw error;
      }
    },
  };
}

