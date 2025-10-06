/**
 * Truncates text by removing middle characters and adding ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length of the truncated text
 * @returns Truncated text with ellipsis in the middle
 */
export const truncateText = (text: string, maxLength: number = 12): string => {
  // Handle null, undefined, or empty strings
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return text || '';
  }

  const trimmedText = text.trim();
  
  // If text is already short enough, return as is
  if (trimmedText.length <= maxLength) {
    return trimmedText;
  }

  // Ensure maxLength is at least 7 to accommodate "..."
  const safeMaxLength = Math.max(maxLength, 7);
  
  // Calculate start and end lengths
  const startLength = Math.floor((safeMaxLength - 3) / 2);
  const endLength = Math.ceil((safeMaxLength - 3) / 2);
  
  // Ensure we don't go beyond the text length
  const actualStartLength = Math.min(startLength, trimmedText.length);
  const actualEndLength = Math.min(endLength, trimmedText.length - actualStartLength);
  
  const start = trimmedText.substring(0, actualStartLength);
  const end = trimmedText.substring(trimmedText.length - actualEndLength);
  
  return `${start}...${end}`;
};

/**
 * Truncates team names specifically for match display
 * @param teamName - The team name to truncate
 * @returns Truncated team name suitable for match display
 */
export const truncateTeamName = (teamName: string): string => {
  // Handle null, undefined, or empty strings
  if (!teamName || typeof teamName !== 'string') {
    return '';
  }

  const trimmedName = teamName.trim();
  
  // If name is short enough, return as is
  if (trimmedName.length <= 8) {
    return trimmedName;
  }
  
  // For very long names, use shorter limit
  if (trimmedName.length > 15) {
    return truncateText(trimmedName, 8);
  }
  
  // For medium length names, use standard limit
  return truncateText(trimmedName, 10);
};
