export type PlatformId =
  | 'youtube'
  | 'instagram'
  | 'pinterest'
  | 'facebook'
  | 'twitter'
  | 'tiktok'
  | 'reddit'
  | 'threads'
  | 'direct'
  | 'unknown';

export type MediaType = 'video' | 'image' | 'gallery' | 'audio' | 'document';

export interface MediaFormatOption {
  id: string;
  label: string;
  format: string; // 'mp4', 'webm', 'mp3', 'jpg', 'png', 'webp', 'pdf', etc.
  quality: string; // '1080p', '720p', '480p', '360p', 'Original', 'HD', 'High Quality', '320kbps'
  resolution?: string; // '1920x1080', '1080x1920', etc.
  fileSize?: number; // bytes
  fileSizeFormatted?: string; // '24.5 MB'
  downloadUrl: string;
  isDirect?: boolean;
  requiresProxy?: boolean;
  hasAudio?: boolean;
  isVideoOnly?: boolean;
}

export interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  format: string;
  fileSizeFormatted?: string;
}

export interface MediaResult {
  id: string;
  originalUrl: string;
  canonicalUrl?: string;
  platform: PlatformId;
  platformName: string;
  title: string;
  description?: string;
  author?: {
    name: string;
    username?: string;
    avatarUrl?: string;
    profileUrl?: string;
  };
  mediaType: MediaType;
  thumbnailUrl: string;
  duration?: number; // seconds
  durationFormatted?: string; // '3:45'
  viewCount?: number;
  likeCount?: number;
  uploadDate?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  formats: MediaFormatOption[];
  gallery?: GalleryItem[];
  complianceNotice?: string;
  officialViewUrl?: string;
  isPartiallyRestricted?: boolean;
  fetchedAt: string;
}

export interface AnalyzeRequest {
  url: string;
}

export interface AnalyzeSuccessResponse {
  success: true;
  data: MediaResult;
}

export interface AnalyzeErrorResponse {
  success: false;
  error: {
    code:
      | 'INVALID_URL'
      | 'UNSUPPORTED_PLATFORM'
      | 'PRIVATE_CONTENT'
      | 'RESTRICTED_CONTENT'
      | 'DELETED_POST'
      | 'API_UNAVAILABLE'
      | 'RATE_LIMITED'
      | 'FETCH_FAILED'
      | 'NO_MEDIA_FOUND'
      | 'SSRF_VIOLATION';
    message: string;
    details?: string;
    officialUrl?: string;
  };
}

export type AnalyzeResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse;

export interface DownloadHistoryItem {
  id: string;
  originalUrl: string;
  title: string;
  platform: PlatformId;
  platformName: string;
  thumbnailUrl: string;
  mediaType: MediaType;
  downloadDate: string;
  format: string;
  quality: string;
}

