export interface SearchPatentsArgs {
  q?: string;
  page?: number;
  num?: number;
  sort?: 'relevance' | 'new' | 'old';
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

export interface GetPatentContentArgs {
  patent_url?: string;
  patent_id?: string;
  include_claims?: boolean;
  include_description?: boolean;
  include_full_text?: boolean;
  max_length?: number;
}

export interface PatentContent {
  full_text?: string;
  claims?: string[];
  description?: string;
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
