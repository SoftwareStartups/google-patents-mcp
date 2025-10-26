import {
  ErrorCode,
  McpError,
  type CallToolResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import winston from 'winston';
import type { PatentService } from '../services/patent.js';
import type {
  FetchPatentOptions,
  GetPatentArgs,
  ToolDefinition,
} from '../types.js';

export const getPatentToolDefinition: Tool = {
  name: 'get_patent',
  description:
    'Fetches comprehensive patent data from SerpAPI including claims, description, family members, citations, and metadata. Supports selective content retrieval via the include parameter.',
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
          'Patent ID (e.g., "US1234567A" or "patent/US1234567A/en"). Will be converted to a patent ID for SerpAPI.',
      },
      include: {
        type: 'array',
        items: {
          type: 'string',
        },
        description:
          'Array of content sections to include in response. Valid values (case-insensitive): "claims", "description", "abstract", "family_members", "citations", "metadata". Defaults to ["metadata", "abstract"] if not provided or empty.',
      },
      max_length: {
        type: 'integer',
        description:
          'Maximum character length for returned content. Content will be truncated at natural boundaries (paragraph ends for descriptions, complete claims for claims arrays). If omitted, no limit is applied.',
      },
    },
    required: [],
  },
};

/**
 * Converts include array to FetchPatentOptions
 */
function parseIncludeOptions(include: string[]): FetchPatentOptions {
  const normalizedInclude = include.map((item) => item.toLowerCase());

  return {
    includeClaims: normalizedInclude.includes('claims'),
    includeDescription: normalizedInclude.includes('description'),
    includeAbstract: normalizedInclude.includes('abstract'),
    includeFamilyMembers: normalizedInclude.includes('family_members'),
    includeCitations: normalizedInclude.includes('citations'),
    includeMetadata: normalizedInclude.includes('metadata'),
  };
}

/**
 * Validates include parameter values
 */
function validateIncludeValues(include: string[]): void {
  const validSections = [
    'claims',
    'description',
    'abstract',
    'family_members',
    'citations',
    'metadata',
  ];

  const normalizedInclude = include.map((item) => item.toLowerCase());

  for (const section of normalizedInclude) {
    if (!validSections.includes(section)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid include value: "${section}". Valid values are: ${validSections.join(', ')}`
      );
    }
  }
}

export function createGetPatentTool(
  patentService: PatentService,
  logger: winston.Logger
): ToolDefinition {
  return {
    definition: getPatentToolDefinition,
    handler: async (args: unknown): Promise<CallToolResult> => {
      const params = args as GetPatentArgs;

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

        // Process include parameter
        const includeParam = params.include || [];
        const includeArray =
          includeParam.length === 0 ? ['metadata', 'abstract'] : includeParam;

        // Validate include values
        validateIncludeValues(includeArray);

        // Convert to options object
        const options: FetchPatentOptions = {
          ...parseIncludeOptions(includeArray),
          maxLength: params.max_length,
        };

        const patentData = await patentService.fetchPatentData(
          urlOrId,
          options
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(patentData, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`Error in get_patent handler: ${errorMessage}`);
        throw error;
      }
    },
  };
}
