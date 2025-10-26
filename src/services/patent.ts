import fetch from 'node-fetch';
import winston from 'winston';
import type {
  FetchPatentOptions,
  PatentData,
  SerpApiClient,
  SerpApiPatentDetailsResponse,
} from '../types.js';
import { DEFAULT_INCLUDE_OPTIONS } from '../utils/constants.js';
import { truncateClaims, truncateText } from '../utils/content-truncator.js';
import {
  extractCitations,
  extractFamilyMembers,
} from '../utils/patent-data-extractor.js';
import { resolvePatentId } from '../utils/patent-id-resolver.js';

export class PatentService {
  private readonly logger: winston.Logger;
  private readonly serpApiClient: SerpApiClient;

  constructor(serpApiClient: SerpApiClient, logger: winston.Logger) {
    this.serpApiClient = serpApiClient;
    this.logger = logger;
  }

  /**
   * Fetches description text from SerpAPI description_link
   */
  private async fetchDescription(
    descriptionLink: string
  ): Promise<string | undefined> {
    try {
      const response = await fetch(descriptionLink);
      const htmlText = await response.text();

      // Extract description content from HTML - get everything inside the main description div
      const descriptionMatch = htmlText.match(
        /<div[^>]*class="description"[^>]*>(.*?)(?=<\/body>|$)/is
      );
      if (descriptionMatch) {
        // Clean up HTML tags and return plain text
        const description = descriptionMatch[1]
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();

        return description.length > 0 ? description : undefined;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch description from ${descriptionLink}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return undefined;
  }

  /**
   * Formats patent metadata from SerpAPI response
   */
  private formatMetadata(
    details: SerpApiPatentDetailsResponse,
    result: PatentData
  ): void {
    if (details.title) result.title = details.title;
    if (details.publication_number)
      result.publication_number = details.publication_number;
    // Extract assignee from assignees array
    if (details.assignees && details.assignees.length > 0) {
      result.assignee = details.assignees[0];
    }
    // Extract inventor from inventors array
    if (details.inventors && details.inventors.length > 0) {
      result.inventor = details.inventors[0].name;
    }
    if (details.priority_date) result.priority_date = details.priority_date;
    if (details.filing_date) result.filing_date = details.filing_date;
    if (details.publication_date)
      result.publication_date = details.publication_date;
  }

  /**
   * Formats patent content based on options
   */
  private async formatContent(
    details: SerpApiPatentDetailsResponse,
    options: Required<FetchPatentOptions>
  ): Promise<PatentData> {
    const result: PatentData = {};

    // Add patent ID (from publication_number)
    if (details.publication_number) {
      result.patent_id = details.publication_number;
    }

    // Add metadata if requested
    if (options.includeMetadata) {
      this.formatMetadata(details, result);
    }

    // Add abstract if requested
    if (options.includeAbstract && details.abstract) {
      result.abstract = details.abstract;
    }

    // Add description if requested
    if (options.includeDescription && details.description_link) {
      const description = await this.fetchDescription(details.description_link);
      if (description) {
        let processedDescription = description;
        if (
          options.maxLength &&
          processedDescription.length > options.maxLength
        ) {
          processedDescription = truncateText(
            processedDescription,
            options.maxLength
          );
        }
        result.description = processedDescription;
      }
    }

    // Add claims if requested
    if (
      options.includeClaims &&
      details.claims &&
      Array.isArray(details.claims)
    ) {
      let claims = details.claims;
      if (options.maxLength) {
        claims = truncateClaims(claims, options.maxLength);
      }
      result.claims = claims;
    }

    // Add family members if requested
    if (options.includeFamilyMembers) {
      result.family_members = extractFamilyMembers(details);
    }

    // Add citations if requested
    if (options.includeCitations) {
      result.citations = extractCitations(details);
    }

    return result;
  }

  /**
   * Fetches patent data from SerpAPI with selective content retrieval
   */
  async fetchPatentData(
    urlOrId: string,
    options: FetchPatentOptions = {}
  ): Promise<PatentData> {
    // Merge with defaults (maxLength stays optional)
    const fullOptions = {
      ...DEFAULT_INCLUDE_OPTIONS,
      ...options,
    } as Required<FetchPatentOptions>;

    const patentId = resolvePatentId(urlOrId);

    this.logger.debug(`Fetching patent data for: ${patentId}`);

    const details = await this.serpApiClient.getPatentDetails(patentId);

    // Validate that the response contains meaningful data
    if (
      details.error ||
      (!details.title && !details.abstract && !details.publication_number)
    ) {
      const errorMessage =
        details.error ||
        `No patent data found for patent ID: ${patentId}. The patent may not exist in the database or may not be accessible.`;
      throw new Error(errorMessage);
    }

    return await this.formatContent(details, fullOptions);
  }
}
