/**
 * URL normalization utilities for duplicate detection
 */

/**
 * Extracts YouTube video ID from various URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Handle URLs with additional parameters
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return videoId;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Normalizes YouTube URLs to a consistent format
 */
export function normalizeYouTubeUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://youtube.com/watch?v=${videoId}`;
}

/**
 * Normalizes general web URLs for consistent comparison
 */
export function normalizeWebUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Convert to lowercase
    urlObj.hostname = urlObj.hostname.toLowerCase();
    
    // Remove www. prefix
    if (urlObj.hostname.startsWith('www.')) {
      urlObj.hostname = urlObj.hostname.slice(4);
    }
    
    // Remove trailing slash
    urlObj.pathname = urlObj.pathname.replace(/\/$/, '') || '/';
    
    // Remove fragment
    urlObj.hash = '';
    
    // Sort query parameters for consistent comparison
    const params = Array.from(urlObj.searchParams.entries());
    params.sort(([a], [b]) => a.localeCompare(b));
    urlObj.search = '';
    params.forEach(([key, value]) => {
      urlObj.searchParams.append(key, value);
    });
    
    // Remove common tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
    trackingParams.forEach(param => urlObj.searchParams.delete(param));
    
    return urlObj.toString();
  } catch {
    return null;
  }
}

/**
 * Determines the type of URL and normalizes it appropriately
 */
export function normalizeUrl(url: string): { normalized: string | null; type: 'youtube' | 'web' | 'invalid' } {
  // Check if it's a YouTube URL
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const normalized = normalizeYouTubeUrl(url);
    return { normalized, type: normalized ? 'youtube' : 'invalid' };
  }
  
  // Otherwise treat as general web URL
  const normalized = normalizeWebUrl(url);
  return { normalized, type: normalized ? 'web' : 'invalid' };
}

/**
 * Validates if a URL is supported for processing
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}