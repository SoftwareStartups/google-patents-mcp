/**
 * Utility functions for extracting patent data from SerpAPI responses
 */

import type {
  PatentCitations,
  PatentFamilyMember,
  SerpApiPatentDetailsResponse,
} from '../types.js';

/**
 * Extracts patent family members from SerpAPI worldwide_applications data
 * @param details - SerpAPI patent details response
 * @returns Array of patent family members
 */
export function extractFamilyMembers(
  details: SerpApiPatentDetailsResponse
): PatentFamilyMember[] {
  if (!details.worldwide_applications) {
    return [];
  }

  const familyMembers: PatentFamilyMember[] = [];

  for (const yearApplications of Object.values(
    details.worldwide_applications
  )) {
    if (Array.isArray(yearApplications)) {
      for (const app of yearApplications) {
        if (app.document_id && app.country_code && app.legal_status) {
          // Skip the main application (this_app is true)
          if (!app.this_app) {
            familyMembers.push({
              patent_id: app.document_id,
              region: app.country_code,
              status: app.legal_status,
            });
          }
        }
      }
    }
  }

  return familyMembers;
}

/**
 * Extracts citation data from SerpAPI response
 * @param details - SerpAPI patent details response
 * @returns Citation data or undefined if no citations found
 */
export function extractCitations(
  details: SerpApiPatentDetailsResponse
): PatentCitations | undefined {
  const forwardCitations = details.patent_citations?.original?.length || 0;
  const backwardCitations = details.cited_by?.original?.length || 0;
  const familyToFamilyCitations =
    details.patent_citations?.family_to_family?.length;

  // Only return if we have at least some citation data
  if (forwardCitations === 0 && backwardCitations === 0) {
    return undefined;
  }

  return {
    forward_citations: forwardCitations,
    backward_citations: backwardCitations,
    family_to_family_citations: familyToFamilyCitations,
  };
}
