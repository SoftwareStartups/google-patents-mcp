/** Search parameters for Google Patents */
export interface SearchPatentsArgs {
  q?: string;
  page?: number;
  num?: number;
  sort?: 'new' | 'old';
  before?: string;
  after?: string;
  inventor?: string;
  assignee?: string;
  country?: string;
  language?: string;
  status?: 'GRANT' | 'APPLICATION';
  type?: 'PATENT' | 'DESIGN';
  scholar?: boolean;
}

/** Options for fetching patent content */
export interface FetchPatentOptions {
  includeClaims?: boolean;
  includeDescription?: boolean;
  includeAbstract?: boolean;
  includeFamilyMembers?: boolean;
  includeCitations?: boolean;
  includeMetadata?: boolean;
  maxLength?: number;
}

export type PatentContentSection = 'claims' | 'description' | 'full_text';

export interface PatentFamilyMember {
  patent_id: string;
  region: string;
  status: string;
}

export interface PatentCitations {
  forward_citations: number;
  backward_citations: number;
  family_to_family_citations?: number;
}

export interface PatentData {
  patent_id?: string;
  title?: string;
  description?: string;
  claims?: string[];
  family_members?: PatentFamilyMember[];
  citations?: PatentCitations;
  publication_number?: string;
  assignee?: string;
  inventor?: string;
  priority_date?: string;
  filing_date?: string;
  grant_date?: string;
  publication_date?: string;
  abstract?: string;
  [key: string]: unknown;
}

export interface PatentResult {
  patent_id?: string;
  publication_number?: string;
  title?: string;
  snippet?: string;
  patent_link?: string;
  assignee?: string;
  inventor?: string;
  priority_date?: string;
  filing_date?: string;
  grant_date?: string;
  publication_date?: string;
  [key: string]: unknown;
}

export interface SerpApiResponse {
  organic_results?: PatentResult[];
  [key: string]: unknown;
}

export interface SerpApiPatentDetailsResponse {
  title?: string;
  publication_number?: string;
  assignees?: string[];
  inventors?: Array<{
    name: string;
    link?: string;
    serpapi_link?: string;
  }>;
  priority_date?: string;
  filing_date?: string;
  publication_date?: string;
  abstract?: string;
  description_link?: string;
  claims?: string[];
  worldwide_applications?: Record<
    string,
    Array<{
      application_number: string;
      country_code: string;
      document_id: string;
      filing_date: string;
      legal_status: string;
      legal_status_cat: string;
      this_app?: boolean;
    }>
  >;
  patent_citations?: {
    original?: Array<{
      publication_number: string;
      title: string;
      [key: string]: unknown;
    }>;
    family_to_family?: Array<unknown>;
  };
  cited_by?: {
    original?: Array<{
      publication_number: string;
      title: string;
      [key: string]: unknown;
    }>;
  };
  error?: string;
  search_metadata?: {
    status?: string;
    results_state?: string;
  };
  [key: string]: unknown;
}

export interface GetPatentArgs {
  patent_url?: string;
  patent_id?: string;
  include?: string[];
  max_length?: number;
}

// Tool-related types
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ToolDefinition {
  definition: Tool;
  handler: (args: unknown) => Promise<CallToolResult>;
}

// Re-export SerpApiClient for use in other modules
export type { SerpApiClient } from './services/serpapi.js';
