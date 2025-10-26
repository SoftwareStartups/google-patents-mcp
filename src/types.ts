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
  patent_id?: string;
  title?: string;
  description?: string;
  abstract?: string;
  claims?: string[];
  country_status?: Array<{
    country: string;
    status: string;
    publication_number?: string;
  }>;
  citations?: {
    forward_citations?: number;
    backward_citations?: number;
    family_to_family_citations?: number;
  };
  publication_number?: string;
  assignee?: string;
  inventor?: string;
  priority_date?: string;
  filing_date?: string;
  grant_date?: string;
  publication_date?: string;
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

// Re-export SerpApiClient for use in other modules
export type { SerpApiClient } from './services/serpapi.js';
