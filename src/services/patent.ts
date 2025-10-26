import winston from 'winston';
import type {
    PatentCitations,
    PatentData,
    PatentFamilyMember,
    SerpApiClient,
    SerpApiPatentDetailsResponse,
} from '../types.js';

export class PatentService {
  private readonly logger: winston.Logger;
  private readonly serpApiClient: SerpApiClient;

  constructor(serpApiClient: SerpApiClient, logger: winston.Logger) {
    this.serpApiClient = serpApiClient;
    this.logger = logger;
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
   * Determines if input is a URL or patent ID and returns the patent ID in correct format
   */
  private resolvePatentId(urlOrId: string): string {
    if (urlOrId.startsWith('http://') || urlOrId.startsWith('https://')) {
      // Extract patent ID from URL
      const match = urlOrId.match(/patent\/([^/]+)/);
      if (match) {
        const patentNumber = match[1];
        return `patent/${patentNumber}/en`;
      }
      // Fallback: try to extract from the end of the URL
      const parts = urlOrId.split('/');
      const patentNumber = parts[parts.length - 1];
      return `patent/${patentNumber}/en`;
    }

    // If it's already in the correct format (patent/number/lang), return as is
    if (urlOrId.startsWith('patent/')) {
      return urlOrId;
    }

    // Otherwise, format as patent/number/en
    const cleanId = urlOrId.replace(/^patent\//, '').replace(/\/.*$/, '');
    return `patent/${cleanId}/en`;
  }

  /**
   * Extracts patent family members from SerpAPI country_status data
   */
  private extractFamilyMembers(
    details: SerpApiPatentDetailsResponse
  ): PatentFamilyMember[] {
    if (!details.country_status || !Array.isArray(details.country_status)) {
      return [];
    }

    return details.country_status.map((country) => ({
      patent_id: country.publication_number || `${country.country}_unknown`,
      region: country.country,
      status: country.status,
    }));
  }

  /**
   * Extracts citation data from SerpAPI response
   */
  private extractCitations(
    details: SerpApiPatentDetailsResponse
  ): PatentCitations | undefined {
    if (!details.citations) {
      return undefined;
    }

    return {
      forward_citations: details.citations.forward_citations || 0,
      backward_citations: details.citations.backward_citations || 0,
      family_to_family_citations: details.citations.family_to_family_citations,
    };
  }

  /**
   * Formats content based on include parameters and applies truncation
   */
  private formatContent(
    details: SerpApiPatentDetailsResponse,
    includeClaims: boolean,
    includeDescription: boolean,
    includeFamilyMembers: boolean,
    includeCitations: boolean,
    includeMetadata: boolean,
    maxLength?: number
  ): PatentData {
    const result: PatentData = {};

    // Add patent ID
    if (details.patent_id) {
      result.patent_id = details.patent_id;
    }

    // Add metadata if requested
    if (includeMetadata) {
      if (details.title) result.title = details.title;
      if (details.publication_number)
        result.publication_number = details.publication_number;
      if (details.assignee) result.assignee = details.assignee;
      if (details.inventor) result.inventor = details.inventor;
      if (details.priority_date) result.priority_date = details.priority_date;
      if (details.filing_date) result.filing_date = details.filing_date;
      if (details.grant_date) result.grant_date = details.grant_date;
      if (details.publication_date)
        result.publication_date = details.publication_date;
      if (details.abstract) result.abstract = details.abstract;
    }

    // Add description if requested
    if (includeDescription && details.description) {
      let description = details.description;
      if (maxLength && description.length > maxLength) {
        description = this.truncateText(description, maxLength);
      }
      result.description = description;
    }

    // Add claims if requested
    if (includeClaims && details.claims && Array.isArray(details.claims)) {
      let claims = details.claims;
      if (maxLength) {
        claims = this.truncateClaims(claims, maxLength);
      }
      result.claims = claims;
    }

    // Add family members if requested
    if (includeFamilyMembers) {
      result.family_members = this.extractFamilyMembers(details);
    }

    // Add citations if requested
    if (includeCitations) {
      result.citations = this.extractCitations(details);
    }

    return result;
  }

  /**
   * Truncates text at natural boundaries
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
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

    return truncatedText + indicator;
  }

  /**
   * Truncates claims array to include only complete claims within maxLength
   */
  private truncateClaims(claims: string[], maxLength: number): string[] {
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

    return includedClaims;
  }

  /**
   * Fetches patent data from SerpAPI with selective content retrieval
   */
  async fetchPatentData(
    urlOrId: string,
    includeClaims = false,
    includeDescription = true,
    includeFamilyMembers = false,
    includeCitations = false,
    includeMetadata = true,
    maxLength?: number
  ): Promise<PatentData> {
    const patentId = this.resolvePatentId(urlOrId);

    this.logger.debug(`Fetching patent data for: ${patentId}`);

    const details = await this.serpApiClient.getPatentDetails(patentId);

    // Validate that the response contains meaningful data
    if (details.error || (!details.patent_id && !details.title && !details.description && !details.abstract)) {
      const errorMessage = details.error || `No patent data found for patent ID: ${patentId}. The patent may not exist in the database or may not be accessible.`;
      throw new Error(errorMessage);
    }

    return this.formatContent(
      details,
      includeClaims,
      includeDescription,
      includeFamilyMembers,
      includeCitations,
      includeMetadata,
      maxLength
    );
  }
}
