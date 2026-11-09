import { MediaResult, PlatformId } from '@/types/media';
import { ExtractionError, PlatformAdapter } from './base';
import { YouTubeAdapter } from './youtube';
import { InstagramAdapter } from './instagram';
import { PinterestAdapter } from './pinterest';
import { TwitterAdapter } from './twitter';
import { TikTokAdapter } from './tiktok';
import { RedditAdapter } from './reddit';
import { ThreadsAdapter } from './threads';
import { FacebookAdapter } from './facebook';
import { DirectMediaAdapter } from './direct-media';

// Maintain singleton instances of each adapter
const adapters: PlatformAdapter[] = [
  new YouTubeAdapter(),
  new InstagramAdapter(),
  new PinterestAdapter(),
  new TwitterAdapter(),
  new TikTokAdapter(),
  new RedditAdapter(),
  new ThreadsAdapter(),
  new FacebookAdapter(),
  new DirectMediaAdapter(),
];

export function getPlatformAdapter(url: string): PlatformAdapter | null {
  try {
    const parsed = new URL(url);
    for (const adapter of adapters) {
      if (adapter.canHandle(url, parsed)) {
        return adapter;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function detectPlatformId(url: string): PlatformId {
  const adapter = getPlatformAdapter(url);
  return adapter ? adapter.id : 'unknown';
}

export async function extractMedia(url: string): Promise<MediaResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ExtractionError(
      'INVALID_URL',
      'Please enter a valid, complete web address (e.g. https://...).'
    );
  }

  // Find matching adapter
  let adapter = getPlatformAdapter(url);

  // If no social adapter matched, attempt direct media inspection
  if (!adapter) {
    const directAdapter = adapters.find((a) => a.id === 'direct');
    if (directAdapter) {
      try {
        const result = await directAdapter.extract(url);
        return result;
      } catch {
        // Not a direct media file
      }
    }

    throw new ExtractionError(
      'UNSUPPORTED_PLATFORM',
      `The domain "${parsed.hostname}" is not currently in the supported platforms index. Check our Supported Platforms page for compatible services.`,
      { officialUrl: url }
    );
  }

  return await adapter.extract(url);
}

export {
  ExtractionError,
  YouTubeAdapter,
  InstagramAdapter,
  PinterestAdapter,
  TwitterAdapter,
  TikTokAdapter,
  RedditAdapter,
  ThreadsAdapter,
  FacebookAdapter,
  DirectMediaAdapter,
};

