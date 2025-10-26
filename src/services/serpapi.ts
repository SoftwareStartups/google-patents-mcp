import fetch, { type Response } from 'node-fetch';
import winston from 'winston';
import type {
  SearchPatentsArgs,
  SerpApiPatentDetailsResponse,
  SerpApiResponse,
} from '../types.js';

export class SerpApiClient {
  private readonly apiKey: string;
  private readonly logger: winston.Logger;
  private readonly timeoutMs: number;
  private readonly baseUrl: string;

  constructor(
    apiKey: string,
    logger: winston.Logger,
    timeoutMs = 30000,
    baseUrl?: string
  ) {
    this.apiKey = apiKey;
    this.logger = logger;
    this.timeoutMs = timeoutMs;
    this.baseUrl =
      baseUrl || process.env.SERPAPI_BASE_URL || 'https://serpapi.com';
  }

  async searchPatents(args: SearchPatentsArgs): Promise<SerpApiResponse> {
    const { q, ...otherParams } = args;

    const query = q || '';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const searchParams = new URLSearchParams({
        engine: 'google_patents',
        q: query,
        api_key: this.apiKey,
      });

      for (const [key, value] of Object.entries(otherParams)) {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      }

      const apiUrl = `${this.baseUrl}/search.json?${searchParams.toString()}`;
      this.logger.info(
        `Calling SerpApi: ${apiUrl.replace(this.apiKey, '****')}`
      );

      const response = await fetch(apiUrl, { signal: controller.signal });

      if (!response.ok) {
        const errorBody = await this.getErrorBody(response);
        this.logger.error(
          `SerpApi request failed with status ${response.status} ${response.statusText}. Response body: ${errorBody}`
        );
        throw new Error(
          `SerpApi request failed: ${response.statusText}. Body: ${errorBody}`
        );
      }

      const data = (await response.json()) as SerpApiResponse;
      this.logger.info(`SerpApi request successful for query: "${query}"`);
      this.logger.debug(`SerpApi response status: ${response.status}`);

      clearTimeout(timeoutId);

      return data;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error(
          `SerpApi request timed out after ${this.timeoutMs}ms for query "${query}"`
        );
        throw new Error('SerpApi request timed out');
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error during fetch or JSON parsing for query "${query}": ${errorMessage}`
      );
      if (error instanceof Error && error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
      throw new Error(`An unexpected error occurred: ${errorMessage}`);
    }
  }

  async getPatentDetails(
    patentId: string
  ): Promise<SerpApiPatentDetailsResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const searchParams = new URLSearchParams({
        engine: 'google_patents_details',
        patent_id: patentId,
        api_key: this.apiKey,
      });

      const apiUrl = `${this.baseUrl}/search.json?${searchParams.toString()}`;
      this.logger.info(
        `Calling SerpApi Patent Details: ${apiUrl.replace(this.apiKey, '****')}`
      );

      const response = await fetch(apiUrl, { signal: controller.signal });

      if (!response.ok) {
        const errorBody = await this.getErrorBody(response);
        this.logger.error(
          `SerpApi patent details request failed with status ${response.status} ${response.statusText}. Response body: ${errorBody}`
        );
        throw new Error(
          `SerpApi patent details request failed: ${response.statusText}. Body: ${errorBody}`
        );
      }

      const data = (await response.json()) as SerpApiPatentDetailsResponse;
      this.logger.info(
        `SerpApi patent details request successful for patent: "${patentId}"`
      );
      this.logger.debug(
        `SerpApi patent details response status: ${response.status}`
      );

      clearTimeout(timeoutId);

      return data;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error(
          `SerpApi patent details request timed out after ${this.timeoutMs}ms for patent "${patentId}"`
        );
        throw new Error('SerpApi patent details request timed out');
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error during patent details fetch or JSON parsing for patent "${patentId}": ${errorMessage}`
      );
      if (error instanceof Error && error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
      throw new Error(`An unexpected error occurred: ${errorMessage}`);
    }
  }

  private async getErrorBody(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch (bodyError) {
      this.logger.warn(
        `Failed to read error response body: ${bodyError instanceof Error ? bodyError.message : String(bodyError)}`
      );
      return 'Could not retrieve error body.';
    }
  }
}
