import { MediaResult, PlatformId } from '@/types/media';

export class ExtractionError extends Error {
  public code:
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
  public details?: string;
  public officialUrl?: string;

  constructor(
    code: ExtractionError['code'],
    message: string,
    options?: { details?: string; officialUrl?: string }
  ) {
    super(message);
    this.name = 'ExtractionError';
    this.code = code;
    this.details = options?.details;
    this.officialUrl = options?.officialUrl;
  }
}

export interface PlatformAdapter {
  id: PlatformId;
  name: string;
  iconName: string;
  canHandle(url: string, parsedUrl?: URL): boolean;
  extract(url: string): Promise<MediaResult>;
}

