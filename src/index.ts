#!/usr/bin/env node
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
import * as dotenv from 'dotenv';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const createLogger = (): winston.Logger => {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf((info) => {
      return `[${String(info.timestamp)}] [${String(info.level)}] ${String(info.message)}`;
    })
  );

  const logger = winston.createLogger({
    level: logLevel,
    format: logFormat,
    transports: [new winston.transports.Console({ level: logLevel })],
  });

  const logFilePath = resolveLogFilePath();
  if (logFilePath) {
    try {
      const fileTransport = new winston.transports.File({
        filename: logFilePath,
        level: logLevel,
        options: { flags: 'a' },
      });
      logger.add(fileTransport);
      logger.debug(`Log file created at: ${logFilePath}`);
    } catch (err) {
      logger.warn(
        `Failed to setup file logging: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return logger;
};

const resolveLogFilePath = (): string | null => {
  const candidates = [
    path.resolve(__dirname, '../../google-patents-server.log'),
    path.resolve(
      process.env.HOME || process.env.USERPROFILE || '',
      '.google-patents-server.log'
    ),
    '/tmp/google-patents-server.log',
  ];

  for (const candidate of candidates) {
    try {
      fs.writeFileSync(
        candidate,
        `# Log file initialization at ${new Date().toISOString()}\n`,
        { flag: 'a' }
      );
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
};

const logger = createLogger();

logger.info('=== Google Patents Server started ===');

const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;

if (!SERPAPI_API_KEY) {
  logger.error('Error: SERPAPI_API_KEY environment variable is not set.');
  process.exit(1);
}

logger.info('SERPAPI_API_KEY found.');

interface SearchPatentsArgs {
  q: string;
  page?: number;
  num?: number;
  sort?: 'relevance' | 'new' | 'old';
  before?: string;
  after?: string;
  inventor?: string;
  assignee?: string;
  country?: string;
  language?: string;
  status?: 'GRANT' | 'APPLICATION';
  type?: 'PATENT' | 'DESIGN';
  scholar?: boolean;
}

class GooglePatentsServer {
  private server: Server;

  constructor() {
    logger.debug('Initializing Google Patents Server');
    this.server = new Server(
      {
        name: 'google-patents-server',
        version: '0.3.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    logger.debug('Setting up tool handlers');
    this.setupToolHandlers();

    this.server.setRequestHandler(ListResourcesRequestSchema, () => ({
      resources: [],
    }));
    this.server.setRequestHandler(ListPromptsRequestSchema, () => ({
      prompts: [],
    }));

    this.server.onerror = (error: Error) => {
      logger.error('[MCP Error]', error);
      logger.debug(
        `MCP server error details: ${error instanceof Error ? error.stack : JSON.stringify(error)}`
      );
    };

    process.on('SIGINT', () => {
      logger.debug('SIGINT received in server handler');
      void this.server.close();
      process.exit(0);
    });

    logger.debug('Google Patents Server initialization completed');
  }

  private setupToolHandlers() {
    logger.debug('Registering ListTools request handler');
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      logger.debug('ListTools handler called');
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
                    "Search query (required). Although optional in SerpApi docs, a non-empty query is practically needed. Use semicolon (;) to separate multiple terms. Advanced syntax like '(Coffee) OR (Tea);(A47J)' is supported. See 'About Google Patents' for details.",
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
              required: ['q'],
            },
          },
        ],
      };
    });

    logger.debug('Registering CallTool request handler');
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      logger.debug('CallToolRequestSchema handler invoked');
      logger.debug(`Received request: ${JSON.stringify(request, null, 2)}`);

      const { name, arguments: args } = request.params;
      logger.debug(
        `CallTool handler called for tool: ${name} with args: ${JSON.stringify(args, null, 2)}`
      );

      if (name === 'search_patents') {
        return await this.handleSearchPatents(
          args as unknown as SearchPatentsArgs
        );
      } else {
        logger.warn(`Received request for unknown tool: ${name}`);
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    });
  }

  private async handleSearchPatents(args: SearchPatentsArgs) {
    const { q, ...otherParams } = args;

    if (!q) {
      logger.error('Missing required argument "q" for search_patents');
      throw new McpError(
        ErrorCode.InvalidParams,
        'Missing required argument: q'
      );
    }

    if (!SERPAPI_API_KEY) {
      logger.error('SERPAPI_API_KEY is not configured.');
      throw new McpError(
        ErrorCode.InternalError,
        'Server configuration error: SERPAPI_API_KEY is missing.'
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const searchParams = new URLSearchParams({
        engine: 'google_patents',
        q: q,
        api_key: SERPAPI_API_KEY,
      });

      for (const [key, value] of Object.entries(otherParams)) {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      }

      const apiUrl = `https://serpapi.com/search.json?${searchParams.toString()}`;
      logger.info(
        `Calling SerpApi: ${apiUrl.replace(SERPAPI_API_KEY, '****')}`
      );

      const response = await fetch(apiUrl, { signal: controller.signal });

      if (!response.ok) {
        let errorBody = 'Could not retrieve error body.';
        try {
          errorBody = await response.text();
        } catch (bodyError) {
          logger.warn(
            `Failed to read error response body: ${bodyError instanceof Error ? bodyError.message : String(bodyError)}`
          );
        }
        logger.error(
          `SerpApi request failed with status ${response.status} ${response.statusText}. Response body: ${errorBody}`
        );
        throw new McpError(
          ErrorCode.InternalError,
          `SerpApi request failed: ${response.statusText}. Body: ${errorBody}`
        );
      }

      const data = await response.json();
      logger.info(`SerpApi request successful for query: "${q}"`);
      logger.debug(`SerpApi response status: ${response.status}`);

      clearTimeout(timeoutId);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(data, null, 2) },
        ],
      };
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        logger.error(
          `SerpApi request timed out after 30 seconds for query "${q}"`
        );
        throw new McpError(
          ErrorCode.InternalError,
          'SerpApi request timed out'
        );
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        `Error during fetch or JSON parsing for query "${q}": ${errorMessage}`
      );
      if (error instanceof Error && error.stack) {
        logger.error(`Stack trace: ${error.stack}`);
      }
      throw new McpError(
        ErrorCode.InternalError,
        `An unexpected error occurred: ${errorMessage}`
      );
    }
  }

  async run() {
    logger.debug('Starting Google Patents MCP server');
    const transport = new StdioServerTransport();
    logger.debug('Created StdioServerTransport');
    await this.server.connect(transport);
    logger.info('Google Patents MCP server running on stdio');
    logger.debug('Server connected to transport and ready to process requests');
  }
}

const flushLogs = () => {
  logger.debug('Flushing logs on process exit');
  try {
    logger.close();
  } catch {
    // Ignore errors during shutdown
  }
};

process.on('exit', flushLogs);
process.on('SIGINT', () => {
  logger.info('Received SIGINT. Shutting down.');
  flushLogs();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}`);
  if (err.stack) {
    logger.error(err.stack);
  }
  flushLogs();
  process.exit(1);
});

const server = new GooglePatentsServer();
server.run().catch((err) => {
  logger.error('Failed to start server:', err);
  logger.debug(
    `Server start failure details: ${err instanceof Error ? err.stack : String(err)}`
  );
  process.exit(1);
});
