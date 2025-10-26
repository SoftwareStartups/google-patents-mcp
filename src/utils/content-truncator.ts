/**
 * Utility functions for truncating patent content
 */

import { TRUNCATE_THRESHOLD } from './constants.js';

/**
 * Truncates text at natural boundaries (paragraphs, sentences, words)
 * @param text - Text to truncate
 * @param maxLength - Maximum length in characters
 * @returns Truncated text with indicator
 */
export function truncateText(text: string, maxLength: number): string {
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
  if (truncateAt === -1 || truncateAt < maxLength * TRUNCATE_THRESHOLD) {
    truncateAt = maxLength;
  }

  const truncatedText = text.substring(0, truncateAt).trim();
  const indicator = `\n\n[Content truncated - ${truncatedText.length} of ${text.length} characters shown]`;

  return truncatedText + indicator;
}

/**
 * Truncates claims array to include only complete claims within maxLength
 * @param claims - Array of claim strings
 * @param maxLength - Maximum total length in characters
 * @returns Truncated claims array
 */
export function truncateClaims(claims: string[], maxLength: number): string[] {
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
