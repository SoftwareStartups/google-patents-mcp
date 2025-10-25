export interface SearchPatentsArgs {
  q: string;
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

export interface SerpApiResponse {
  [key: string]: unknown;
}
