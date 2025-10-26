/**
 * Utility functions for resolving and converting patent IDs
 */

import { DEFAULT_PATENT_ID_LANGUAGE } from './constants.js';

/**
 * Determines if input is a URL or patent ID and returns the patent ID in correct format
 * @param urlOrId - Patent URL or ID
 * @returns Normalized patent ID in format "patent/{number}/{language}"
 */
export function resolvePatentId(urlOrId: string): string {
  if (urlOrId.startsWith('http://') || urlOrId.startsWith('https://')) {
    // Extract patent ID from URL
    const match = urlOrId.match(/patent\/([^/]+)/);
    if (match) {
      const patentNumber = match[1];
      return `patent/${patentNumber}/${DEFAULT_PATENT_ID_LANGUAGE}`;
    }
    // Fallback: try to extract from the end of the URL
    const parts = urlOrId.split('/');
    const patentNumber = parts[parts.length - 1];
    return `patent/${patentNumber}/${DEFAULT_PATENT_ID_LANGUAGE}`;
  }

  // If it's already in the correct format (patent/number/lang), return as is
  if (urlOrId.startsWith('patent/') && urlOrId.split('/').length === 3) {
    return urlOrId;
  }

  // If it starts with patent/ but no language, add language
  if (urlOrId.startsWith('patent/')) {
    const cleanId = urlOrId.replace(/^patent\//, '').replace(/\/.*$/, '');
    return `patent/${cleanId}/${DEFAULT_PATENT_ID_LANGUAGE}`;
  }

  // Otherwise, format as patent/number/language
  return `patent/${urlOrId}/${DEFAULT_PATENT_ID_LANGUAGE}`;
}
