import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import winston from 'winston';
import type { SearchPatentsArgs } from './types.js';
import type { SerpApiClient } from './services/serpapi.js';

export class GooglePatentsServer {
  private readonly server: Server;
  private readonly logger: winston.Logger;
  private readonly serpApiClient: SerpApiClient;

  constructor(
    version: string,
    logger: winston.Logger,
    serpApiClient: SerpApiClient
  ) {
    this.logger = logger;
    this.serpApiClient = serpApiClient;

    this.logger.debug('Initializing Google Patents Server');
    this.server = new Server(
      {
        name: 'google-patents-server',
        version,
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    this.logger.debug('Setting up handlers');
    this.setupHandlers();
    this.setupErrorHandlers();

    this.logger.debug('Google Patents Server initialization completed');
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListResourcesRequestSchema, () => ({
      resources: [],
    }));

    this.server.setRequestHandler(ListPromptsRequestSchema, () => ({
      prompts: [],
    }));

    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      this.logger.debug('ListTools handler called');
      return {
        tools: [
          {
            name: 'search_patents',
            description:
              'Searches Google Patents using SerpApi. Allows filtering by date, inventor, assignee, country, language, status, type, and sorting.',
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
                  description:
                    "Filter by patent status: 'GRANT' or 'APPLICATION'.",
                },
                type: {
                  type: 'string',
                  enum: ['PATENT', 'DESIGN'],
                  description: "Filter by patent type: 'PATENT' or 'DESIGN'.",
                },
                scholar: {
                  type: 'boolean',
                  description:
                    'Include Google Scholar results (default: false).',
                  default: false,
                },
              },
              required: [],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      this.logger.debug('CallToolRequestSchema handler invoked');
      this.logger.debug(
        `Received request: ${JSON.stringify(request, null, 2)}`
      );

      const { name, arguments: args } = request.params;
      this.logger.debug(
        `CallTool handler called for tool: ${name} with args: ${JSON.stringify(args, null, 2)}`
      );

      if (name === 'search_patents') {
        return await this.handleSearchPatents(
          args as unknown as SearchPatentsArgs
        );
      } else {
        this.logger.warn(`Received request for unknown tool: ${name}`);
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    });
  }

  private setupErrorHandlers(): void {
    this.server.onerror = (error: Error) => {
      this.logger.error('[MCP Error]', error);
      this.logger.debug(
        `MCP server error details: ${error instanceof Error ? error.stack : JSON.stringify(error)}`
      );
    };

    process.on('SIGINT', () => {
      this.logger.debug('SIGINT received in server handler');
      void this.server.close();
      process.exit(0);
    });
  }

  private async handleSearchPatents(args: SearchPatentsArgs) {
    try {
      const data = await this.serpApiClient.searchPatents(args);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data, null, 2) },
        ],
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in handleSearchPatents: ${errorMessage}`);

      if (errorMessage.includes('Missing required argument')) {
        throw new McpError(ErrorCode.InvalidParams, errorMessage);
      }

      throw new McpError(ErrorCode.InternalError, errorMessage);
    }
  }

  async run(): Promise<void> {
    this.logger.debug('Starting Google Patents MCP server');
    const transport = new StdioServerTransport();
    this.logger.debug('Created StdioServerTransport');
    await this.server.connect(transport);
    this.logger.info('Google Patents MCP server running on stdio');
    this.logger.debug(
      'Server connected to transport and ready to process requests'
    );
  }

  async close(): Promise<void> {
    await this.server.close();
  }
}
