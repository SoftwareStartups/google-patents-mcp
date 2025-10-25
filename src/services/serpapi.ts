import fetch, { type Response } from 'node-fetch';
import winston from 'winston';
import type {
    PatentContent,
    PatentResult,
    SearchPatentsArgs,
    SerpApiResponse,
} from '../types.js';

export class SerpApiClient {
  private readonly apiKey: string;
  private readonly logger: winston.Logger;
  private readonly timeoutMs: number;

  constructor(apiKey: string, logger: winston.Logger, timeoutMs = 30000) {
    this.apiKey = apiKey;
    this.logger = logger;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Parses patent HTML content to extract full text, claims, and description
   */
  private parsePatentHtml(html: string): PatentContent {
    const content: PatentContent = {
      content_included: false,
    };

    try {
      // Extract claims section
      const claimsMatch = html.match(
        /<section[^>]*itemprop="claims"[^>]*>([\s\S]*?)<\/section>/i
      );
      if (claimsMatch) {
        const claimsHtml = claimsMatch[1];
        // Extract individual claims marked with itemprop="claim"
        const claimMatches = claimsHtml.matchAll(
          /<div[^>]*itemprop="claim"[^>]*[^>]*num="(\d+)"[^>]*>([\s\S]*?)<\/div>/gi
        );
        const claims: string[] = [];
        for (const match of claimMatches) {
          const claimNum = match[1];
          const claimText = this.cleanHtmlText(match[2]);
          if (claimText) {
            claims.push(`${claimNum}. ${claimText}`);
          }
        }
        if (claims.length > 0) {
          content.claims = claims;
        }
      }

      // Extract description section
      const descMatch = html.match(
        /<section[^>]*itemprop="description"[^>]*>([\s\S]*?)<\/section>/i
      );
      if (descMatch) {
        const descHtml = descMatch[1];
        const cleanDesc = this.cleanHtmlText(descHtml);
        if (cleanDesc) {
          content.description = cleanDesc;
        }
      }

      // Extract abstract as fallback
      if (!content.description) {
        const abstractMatch = html.match(
          /<section[^>]*itemprop="abstract"[^>]*>([\s\S]*?)<\/section>/i
        );
        if (abstractMatch) {
          const abstractText = this.cleanHtmlText(abstractMatch[1]);
          if (abstractText) {
            content.description = `Abstract: ${abstractText}`;
          }
        }
      }

      // Generate full_text from available components
      const parts: string[] = [];
      if (content.description) {
        parts.push('DESCRIPTION:\n' + content.description);
      }
      if (content.claims && content.claims.length > 0) {
        parts.push('\n\nCLAIMS:\n' + content.claims.join('\n\n'));
      }
      if (parts.length > 0) {
        content.full_text = parts.join('\n');
        content.content_included = true;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to parse patent HTML: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return content;
  }

  /**
   * Cleans HTML text by removing tags and normalizing whitespace
   */
  private cleanHtmlText(html: string): string {
    return (
      html
        // Remove script and style tags and their content
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        // Remove HTML tags
        .replace(/<[^>]+>/g, ' ')
        // Decode HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  /**
   * Fetches full patent content from a Google Patents URL
   */
  async fetchPatentContent(patentUrl: string): Promise<PatentContent> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      this.logger.debug(`Fetching patent content from: ${patentUrl}`);

      const response = await fetch(patentUrl, { signal: controller.signal });

      if (!response.ok) {
        this.logger.warn(
          `Failed to fetch patent content: ${response.status} ${response.statusText}`
        );
        return { content_included: false };
      }

      const html = await response.text();
      clearTimeout(timeoutId);

      return this.parsePatentHtml(html);
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn(`Patent content fetch timed out for ${patentUrl}`);
      } else {
        this.logger.warn(
          `Error fetching patent content: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      return { content_included: false };
    }
  }

  async searchPatents(args: SearchPatentsArgs): Promise<SerpApiResponse> {
    const {
      q,
      include_full_content,
      include_claims,
      include_description,
      ...otherParams
    } = args;

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

      const apiUrl = `https://serpapi.com/search.json?${searchParams.toString()}`;
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

      // Fetch full content if requested
      if (
        (include_full_content || include_claims || include_description) &&
        data.organic_results &&
        Array.isArray(data.organic_results)
      ) {
        this.logger.info(
          `Fetching full content for ${data.organic_results.length} patents`
        );

        // Process patents in parallel with reasonable concurrency limit
        const results = await Promise.all(
          data.organic_results.map(async (patent: PatentResult) => {
            if (patent.patent_link) {
              try {
                const content = await this.fetchPatentContent(
                  patent.patent_link
                );

                // Filter content based on what was requested
                const filteredContent: PatentContent = {
                  content_included: content.content_included,
                };

                if (include_full_content || include_claims) {
                  filteredContent.claims = content.claims;
                }

                if (include_full_content || include_description) {
                  filteredContent.description = content.description;
                }

                if (include_full_content) {
                  filteredContent.full_text = content.full_text;
                }

                patent.full_content = filteredContent;
              } catch (error) {
                this.logger.warn(
                  `Failed to fetch content for patent ${patent.publication_number || patent.patent_id}: ${error instanceof Error ? error.message : String(error)}`
                );
                patent.full_content = { content_included: false };
              }
            }
            return patent;
          })
        );

        data.organic_results = results;
      }

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
