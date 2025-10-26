/**
 * Application constants and default values
 */

/** Threshold for truncation fallback (0.8 = 80% of maxLength) */
export const TRUNCATE_THRESHOLD = 0.8;

/** Default language for patent ID resolution */
export const DEFAULT_PATENT_ID_LANGUAGE = 'en';

/** Default content sections to include when fetching patent data */
export const DEFAULT_INCLUDE_OPTIONS = {
  includeMetadata: true,
  includeAbstract: true,
  includeClaims: false,
  includeDescription: false,
  includeFamilyMembers: false,
  includeCitations: false,
};
