import fetch from 'node-fetch';
import winston from 'winston';
import type { PatentContent } from '../types.js';

export class PatentContentService {
  private readonly logger: winston.Logger;
  private readonly timeoutMs: number;

  constructor(logger: winston.Logger, timeoutMs = 30000) {
    this.logger = logger;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Converts a patent ID to a Google Patents URL
   */
  private convertPatentIdToUrl(patentId: string): string {
    // Remove any path-like prefix if present (e.g., "patent/US1234567/en" -> "US1234567")
    const cleanId = patentId.replace(/^patent\//, '').replace(/\/.*$/, '');
    return `https://patents.google.com/patent/${cleanId}`;
  }

  /**
   * Determines if input is a URL or patent ID and returns the URL
   */
  private resolveUrl(urlOrId: string): string {
    if (urlOrId.startsWith('http://') || urlOrId.startsWith('https://')) {
      return urlOrId;
    }
    return this.convertPatentIdToUrl(urlOrId);
  }

  /**
   * Parses patent HTML content to extract full text, claims, and description
   */
  private parsePatentHtml(
    html: string,
    includeClaims: boolean,
    includeDescription: boolean,
    includeFullText: boolean
  ): PatentContent {
    const content: PatentContent = {};

    try {
      let parsedClaims: string[] | undefined;
      let parsedDescription: string | undefined;

      // Extract claims section if needed for claims or full_text
      if (includeClaims || includeFullText) {
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
            parsedClaims = claims;
          }
        }
      }

      // Extract description section if needed for description or full_text
      if (includeDescription || includeFullText) {
        const descMatch = html.match(
          /<section[^>]*itemprop="description"[^>]*>([\s\S]*?)<\/section>/i
        );
        if (descMatch) {
          const descHtml = descMatch[1];
          const cleanDesc = this.cleanHtmlText(descHtml);
          if (cleanDesc) {
            parsedDescription = cleanDesc;
          }
        }

        // Extract abstract as fallback
        if (!parsedDescription) {
          const abstractMatch = html.match(
            /<section[^>]*itemprop="abstract"[^>]*>([\s\S]*?)<\/section>/i
          );
          if (abstractMatch) {
            const abstractText = this.cleanHtmlText(abstractMatch[1]);
            if (abstractText) {
              parsedDescription = `Abstract: ${abstractText}`;
            }
          }
        }
      }

      // Add claims to result if requested
      if (includeClaims && parsedClaims) {
        content.claims = parsedClaims;
      }

      // Add description to result if requested
      if (includeDescription && parsedDescription) {
        content.description = parsedDescription;
      }

      // Generate full_text if requested
      if (includeFullText) {
        const parts: string[] = [];
        if (parsedDescription) {
          parts.push('DESCRIPTION:\n' + parsedDescription);
        }
        if (parsedClaims && parsedClaims.length > 0) {
          parts.push('\n\nCLAIMS:\n' + parsedClaims.join('\n\n'));
        }
        if (parts.length > 0) {
          content.full_text = parts.join('\n');
        }
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
   * Fetches full patent content from a Google Patents URL or patent ID
   */
  async fetchContent(
    urlOrId: string,
    includeClaims = true,
    includeDescription = true,
    includeFullText = true
  ): Promise<PatentContent> {
    const patentUrl = this.resolveUrl(urlOrId);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      this.logger.debug(`Fetching patent content from: ${patentUrl}`);

      const response = await fetch(patentUrl, { signal: controller.signal });

      if (!response.ok) {
        this.logger.warn(
          `Failed to fetch patent content: ${response.status} ${response.statusText}`
        );
        return {};
      }

      const html = await response.text();
      clearTimeout(timeoutId);

      return this.parsePatentHtml(
        html,
        includeClaims,
        includeDescription,
        includeFullText
      );
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn(`Patent content fetch timed out for ${patentUrl}`);
      } else {
        this.logger.warn(
          `Error fetching patent content: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      return {};
    }
  }
}

