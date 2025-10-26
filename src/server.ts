import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import winston from 'winston';
import type { ToolDefinition } from './tools/index.js';

export class GooglePatentsServer {
  private readonly server: Server;
  private readonly logger: winston.Logger;
  private readonly tools: Map<string, ToolDefinition>;

  constructor(
    version: string,
    logger: winston.Logger,
    tools: ToolDefinition[]
  ) {
    this.logger = logger;
    this.tools = new Map(tools.map((tool) => [tool.definition.name, tool]));

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
        tools: Array.from(this.tools.values()).map((tool) => tool.definition),
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

      const tool = this.tools.get(name);
      if (!tool) {
        this.logger.warn(`Received request for unknown tool: ${name}`);
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }

      return await tool.handler(args);
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
