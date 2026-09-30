import { DriveLink } from './types';

// Regex patterns to detect Google Drive / Docs / Sheets / Slides / Folder URLs
const GOOGLE_DRIVE_PATTERNS = [
  /https?:\/\/(?:www\.)?drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)(?:\/[^\s]*)?/gi,
  /https?:\/\/(?:www\.)?drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)(?:\/[^\s]*)?/gi,
  /https?:\/\/(?:www\.)?drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)(?:[^\s]*)?/gi,
  /https?:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)(?:\/[^\s]*)?/gi,
  /https?:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(?:\/[^\s]*)?/gi,
  /https?:\/\/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)(?:\/[^\s]*)?/gi,
  /https?:\/\/(?:www\.)?drive\.google\.com\/drive\/u\/\d+\/folders\/([a-zA-Z0-9_-]+)(?:\/[^\s]*)?/gi,
  /https?:\/\/(?:www\.)?drive\.google\.com\/file\/u\/\d+\/d\/([a-zA-Z0-9_-]+)(?:\/[^\s]*)?/gi,
];

export function extractDriveLinks(text: string): DriveLink[] {
  if (!text) return [];
  const links: DriveLink[] = [];
  const seenUrls = new Set<string>();

  for (const pattern of GOOGLE_DRIVE_PATTERNS) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      const url = match[0];
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      const fileId = match[1];
      let type: DriveLink['type'] = 'file';
      let title = 'Google Drive File';

      if (url.includes('docs.google.com/document')) {
        type = 'document';
        title = 'Google Docs Document';
      } else if (url.includes('docs.google.com/spreadsheets')) {
        type = 'spreadsheet';
        title = 'Google Sheets Spreadsheet';
      } else if (url.includes('docs.google.com/presentation')) {
        type = 'presentation';
        title = 'Google Slides Presentation';
      } else if (url.includes('/folders/')) {
        type = 'folder';
        title = 'Google Drive Folder';
      }

      links.push({
        url,
        fileId,
        type,
        title,
      });
    }
  }

  return links;
}

export function isValidDriveUrl(url: string): boolean {
  return GOOGLE_DRIVE_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(url);
  });
}
