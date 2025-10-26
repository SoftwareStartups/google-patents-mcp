/**
 * Shared test fixtures and mock data for tests
 */

import type {
  PatentData,
  PatentResult,
  SerpApiResponse,
} from '../../src/types.js';

export const mockPatentResult: PatentResult = {
  patent_id: 'US7654321B2',
  publication_number: 'US7654321B2',
  title: 'Test Patent for Neural Networks',
  snippet: 'A method for implementing neural networks...',
  patent_link: 'https://patents.google.com/patent/US7654321B2',
  assignee: 'Tech Corporation',
  inventor: 'John Doe',
  priority_date: '2020-01-01',
  filing_date: '2020-02-01',
  publication_date: '2021-03-01',
};

export const mockSearchResponse: SerpApiResponse = {
  search_metadata: {
    status: 'Success',
  },
  search_parameters: {
    q: 'quantum computer',
    page: 1,
    num: 10,
  },
  organic_results: [mockPatentResult],
};

export const mockPatentData: PatentData = {
  patent_id: 'US7654321B2',
  title: 'Test Patent for Neural Networks',
  publication_number: 'US7654321B2',
  assignee: 'Tech Corporation',
  inventor: 'John Doe',
  priority_date: '2020-01-01',
  filing_date: '2020-02-01',
  publication_date: '2021-03-01',
  abstract:
    'This patent describes a novel method for implementing neural networks.',
  description: 'Detailed description of the invention...',
  claims: [
    '1. A method for implementing neural networks comprising...',
    '2. The method of claim 1, wherein...',
  ],
  family_members: [
    {
      patent_id: 'EP1234567A1',
      region: 'EP',
      status: 'Pending',
    },
  ],
  citations: {
    forward_citations: 10,
    backward_citations: 5,
    family_to_family_citations: 2,
  },
};

export const mockPatentDetailsResponse = {
  title: 'Test Patent for Neural Networks',
  publication_number: 'US7654321B2',
  assignees: ['Tech Corporation'],
  inventors: [{ name: 'John Doe' }],
  priority_date: '2020-01-01',
  filing_date: '2020-02-01',
  publication_date: '2021-03-01',
  abstract:
    'This patent describes a novel method for implementing neural networks.',
  description_link: 'https://serpapi.com/test-description.html',
  claims: [
    '1. A method for implementing neural networks comprising...',
    '2. The method of claim 1, wherein...',
  ],
  worldwide_applications: {
    '2020': [
      {
        application_number: 'US12/345,678',
        country_code: 'US',
        document_id: 'US7654321B2',
        filing_date: '2020-02-01',
        legal_status: 'Active',
        legal_status_cat: 'active',
        this_app: true,
      },
      {
        application_number: 'EP20123456',
        country_code: 'EP',
        document_id: 'EP1234567A1',
        filing_date: '2020-02-15',
        legal_status: 'Pending',
        legal_status_cat: 'pending',
        this_app: false,
      },
    ],
  },
  patent_citations: {
    original: [
      { publication_number: 'US1111111', title: 'Prior Art 1' },
      { publication_number: 'US2222222', title: 'Prior Art 2' },
      { publication_number: 'US3333333', title: 'Prior Art 3' },
      { publication_number: 'US4444444', title: 'Prior Art 4' },
      { publication_number: 'US5555555', title: 'Prior Art 5' },
    ],
    family_to_family: [
      { publication_number: 'US6666666' },
      { publication_number: 'US7777777' },
    ],
  },
  cited_by: {
    original: Array(10)
      .fill(null)
      .map((_, i) => ({
        publication_number: `US${8000000 + i}`,
        title: `Citing Patent ${i + 1}`,
      })),
  },
};
