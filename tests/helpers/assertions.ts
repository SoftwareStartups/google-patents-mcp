/**
 * Custom assertions for patent data validation
 */

import type {
  PatentData,
  PatentResult,
  SerpApiResponse,
} from '../../src/types.js';

export function assertValidSearchResponse(data: SerpApiResponse): void {
  if (!data.search_metadata) {
    throw new Error('Response missing search_metadata');
  }

  if (!data.search_parameters) {
    throw new Error('Response missing search_parameters');
  }

  const metadata = data.search_metadata as { status?: string };
  if (metadata.status && metadata.status !== 'Success') {
    throw new Error(`SerpApi search status: ${metadata.status}`);
  }
}

export function assertValidPatentResult(result: PatentResult): void {
  if (!result.title && !result.patent_id) {
    throw new Error('Patent result missing both title and patent_id');
  }
}

export function assertValidPatentData(data: PatentData): void {
  if (!data.patent_id && !data.title && !data.publication_number) {
    throw new Error('Patent data missing identifying information');
  }
}

export function assertHasMetadata(data: PatentData): void {
  if (!data.title || !data.publication_number) {
    throw new Error('Patent data missing required metadata fields');
  }
}

export function assertHasAbstract(data: PatentData): void {
  if (!data.abstract) {
    throw new Error('Patent data missing abstract');
  }
}

export function assertHasClaims(data: PatentData): void {
  if (!data.claims || data.claims.length === 0) {
    throw new Error('Patent data missing claims');
  }
}

export function assertHasDescription(data: PatentData): void {
  if (!data.description) {
    throw new Error('Patent data missing description');
  }
}

export function assertHasFamilyMembers(data: PatentData): void {
  if (!data.family_members || data.family_members.length === 0) {
    throw new Error('Patent data missing family members');
  }
}

export function assertHasCitations(data: PatentData): void {
  if (!data.citations) {
    throw new Error('Patent data missing citations');
  }
}
