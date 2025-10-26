/**
 * Mock SerpAPI server for integration tests
 *
 * This provides a local HTTP server that mimics SerpAPI endpoints
 * to test the MCP server without making real API calls.
 */

import type { Application } from 'express';
import express from 'express';
import { createServer, type Server } from 'http';
import { mockPatentDetailsResponse, mockSearchResponse } from './test-data.js';

export class MockSerpApiServer {
  private app: Application;
  private server: Server | null = null;
  private port: number;
  private baseUrl: string = '';

  constructor() {
    this.app = express();
    this.port = 0; // Random port assigned by OS
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Main search endpoint that mimics SerpAPI
    this.app.get('/search.json', (req, res) => {
      const { engine } = req.query;

      // Simulate patent search
      if (engine === 'google_patents') {
        return res.json(mockSearchResponse);
      }

      // Simulate patent details
      if (engine === 'google_patents_details') {
        return res.json(mockPatentDetailsResponse);
      }

      // Default response
      return res.json(mockSearchResponse);
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });
  }

  async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = createServer(this.app);

      this.server.listen(this.port, '127.0.0.1', () => {
        const address = this.server!.address();
        if (address && typeof address === 'object') {
          this.port = address.port;
          this.baseUrl = `http://127.0.0.1:${this.port}`;
          // eslint-disable-next-line no-console
          console.log(`Mock SerpAPI server started on ${this.baseUrl}`);
          resolve(this.baseUrl);
        } else {
          reject(new Error('Failed to start mock server'));
        }
      });

      this.server.on('error', (err) => {
        // eslint-disable-next-line no-console
        console.error('Mock SerpAPI server error:', err);
        reject(err);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) {
            // eslint-disable-next-line no-console
            console.error('Error stopping mock server:', err);
            reject(err);
          } else {
            // eslint-disable-next-line no-console
            console.log('Mock SerpAPI server stopped');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getPort(): number {
    return this.port;
  }
}
