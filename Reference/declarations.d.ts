declare module '@modelcontextprotocol/sdk/server/index.js' {
    export class Server {
      constructor(config: { name: string, version: string }, options: { capabilities: { resources: any, tools: any } });
      setRequestHandler(schema: any, handler: (request: any) => Promise<any>): void;
      connect(transport: any): Promise<void>;
      close(): Promise<void>;
      onerror: (error: any) => void;
    }
    export default Server;
  }
  
  declare module '@modelcontextprotocol/sdk/server/stdio.js' {
    export class StdioServerTransport {}
  }
  
  declare module '@modelcontextprotocol/sdk/types.js' {
    export const CallToolRequestSchema: any;
    export const ListToolsRequestSchema: any;
    export class McpError extends Error {
      constructor(code: number, message: string);
    }
  }