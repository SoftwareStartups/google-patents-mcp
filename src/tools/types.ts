import type {
    CallToolResult,
    Tool,
} from '@modelcontextprotocol/sdk/types.js';

export interface ToolDefinition {
  definition: Tool;
  handler: (args: unknown) => Promise<CallToolResult>;
}

