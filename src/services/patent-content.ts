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
    includeFullText: boolean,
    maxLength?: number
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

      // Apply truncation if maxLength is specified
      if (maxLength && maxLength > 0) {
        // Truncate claims if requested
        if (includeClaims && parsedClaims) {
          const truncated = this.truncateClaims(parsedClaims, maxLength);
          content.claims = truncated.claims;
        }

        // Truncate description if requested
        if (includeDescription && parsedDescription) {
          const truncated = this.truncateDescription(
            parsedDescription,
            maxLength
          );
          content.description = truncated.text;
        }

        // Generate and truncate full_text if requested
        if (includeFullText) {
          const parts: string[] = [];
          if (parsedDescription) {
            parts.push('DESCRIPTION:\n' + parsedDescription);
          }
          if (parsedClaims && parsedClaims.length > 0) {
            parts.push('\n\nCLAIMS:\n' + parsedClaims.join('\n\n'));
          }
          if (parts.length > 0) {
            const fullText = parts.join('\n');
            const truncated = this.truncateFullText(fullText, maxLength);
            content.full_text = truncated.text;
          }
        }
      } else {
        // No truncation - add content as-is
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
      }
    } catch (error) {
      this.logger.warn(
        `Failed to parse patent HTML: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return content;
  }

  /**
   * Truncates description text at paragraph boundaries
   */
  private truncateDescription(
    text: string,
    maxLength: number
  ): { text: string; truncated: boolean } {
    if (text.length <= maxLength) {
      return { text, truncated: false };
    }

    // Try to find last paragraph break (\n\n) before maxLength
    let truncateAt = text.lastIndexOf('\n\n', maxLength);

    // If no paragraph break found, try single newline
    if (truncateAt === -1) {
      truncateAt = text.lastIndexOf('\n', maxLength);
    }

    // If no newline found, truncate at word boundary
    if (truncateAt === -1) {
      truncateAt = text.lastIndexOf(' ', maxLength);
    }

    // Fallback to hard truncate if no good boundary found
    if (truncateAt === -1 || truncateAt < maxLength * 0.8) {
      truncateAt = maxLength;
    }

    const truncatedText = text.substring(0, truncateAt).trim();
    const indicator = `\n\n[Content truncated - ${truncatedText.length} of ${text.length} characters shown]`;

    return { text: truncatedText + indicator, truncated: true };
  }

  /**
   * Truncates claims array to include only complete claims within maxLength
   */
  private truncateClaims(
    claims: string[],
    maxLength: number
  ): { claims: string[]; truncated: boolean } {
    let totalLength = 0;
    const includedClaims: string[] = [];

    for (const claim of claims) {
      const claimLength = claim.length + 2; // +2 for newlines between claims
      if (totalLength + claimLength <= maxLength) {
        includedClaims.push(claim);
        totalLength += claimLength;
      } else {
        break;
      }
    }

    const truncated = includedClaims.length < claims.length;
    return { claims: includedClaims, truncated };
  }

  /**
   * Truncates full text at natural boundaries (paragraphs or claim boundaries)
   */
  private truncateFullText(
    text: string,
    maxLength: number
  ): { text: string; truncated: boolean } {
    if (text.length <= maxLength) {
      return { text, truncated: false };
    }

    // Try to preserve complete sections
    const descriptionMatch = text.match(/^DESCRIPTION:\n([\s\S]*?)(?=\n\nCLAIMS:|$)/);
    const claimsMatch = text.match(/\n\nCLAIMS:\n([\s\S]*)$/);

    let result = '';
    let remaining = maxLength;

    // Try to include description section
    if (descriptionMatch && descriptionMatch[0].length < remaining) {
      result = descriptionMatch[0];
      remaining -= descriptionMatch[0].length;
    } else if (descriptionMatch) {
      // Truncate description to fit
      const descPart = this.truncateDescription(
        descriptionMatch[0],
        maxLength
      );
      return { text: descPart.text, truncated: true };
    }

    // Try to include claims section if there's room
    if (claimsMatch && remaining > 50) {
      const claimsText = claimsMatch[0];
      if (result.length + claimsText.length <= maxLength) {
        result += claimsText;
      } else {
        // Truncate at claim boundaries
        const claimLines = claimsText.split('\n\n');
        for (const line of claimLines) {
          if (result.length + line.length + 2 <= maxLength) {
            result += (result.length > 0 ? '\n\n' : '') + line;
          } else {
            break;
          }
        }
      }
    }

    if (result.length === 0) {
      // Fallback to simple truncation
      return this.truncateDescription(text, maxLength);
    }

    const indicator = `\n\n[Content truncated - ${result.length} of ${text.length} characters shown]`;
    return { text: result.trim() + indicator, truncated: true };
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
    includeFullText = true,
    maxLength?: number
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
        includeFullText,
        maxLength
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

