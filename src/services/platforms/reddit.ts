import { GalleryItem, MediaFormatOption, MediaResult, MediaType } from '@/types/media';
import { ExtractionError, PlatformAdapter } from './base';
import { formatBytes, formatDuration } from '@/lib/utils';
import { sanitizeFilename } from '@/lib/security';

export class RedditAdapter implements PlatformAdapter {
  public id = 'reddit' as const;
  public name = 'Reddit';
  public iconName = 'MessageSquare';

  public canHandle(url: string, parsedUrl?: URL): boolean {
    try {
      const u = parsedUrl || new URL(url);
      const host = u.hostname.toLowerCase();
      return (
        host === 'reddit.com' ||
        host.endsWith('.reddit.com') ||
        host === 'redd.it' ||
        host === 'v.redd.it' ||
        host === 'i.redd.it'
      );
    } catch {
      return false;
    }
  }

  public async extract(url: string): Promise<MediaResult> {
    const parsed = new URL(url);

    // Direct i.redd.it image
    if (parsed.hostname.toLowerCase() === 'i.redd.it') {
      const filename = parsed.pathname.split('/').pop() || 'reddit_image.jpg';
      const cleanTitle = sanitizeFilename(filename.replace(/\.[^/.]+$/, ''), 'Reddit Image');
      return {
        id: `reddit-${cleanTitle}`,
        originalUrl: url,
        platform: 'reddit',
        platformName: 'Reddit',
        title: cleanTitle,
        mediaType: 'image',
        thumbnailUrl: url,
        formats: [
          {
            id: 'reddit-orig-img',
            label: 'Original High-Res Image',
            format: 'jpg',
            quality: 'Original Resolution',
            downloadUrl: `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(cleanTitle + '.jpg')}`,
            isDirect: true,
          },
        ],
        fetchedAt: new Date().toISOString(),
      };
    }

    // Direct v.redd.it video
    if (parsed.hostname.toLowerCase() === 'v.redd.it') {
      const videoId = parsed.pathname.split('/').filter(Boolean)[0] || 'video';
      const videoUrl = `https://v.redd.it/${videoId}/DASH_720.mp4`;
      return {
        id: `reddit-v-${videoId}`,
        originalUrl: url,
        platform: 'reddit',
        platformName: 'Reddit',
        title: `Reddit Video ${videoId}`,
        mediaType: 'video',
        thumbnailUrl: `https://v.redd.it/${videoId}/DASH_360.mp4`,
        formats: [
          {
            id: 'reddit-v-720',
            label: 'HD Video 720p (MP4)',
            format: 'mp4',
            quality: '720p',
            downloadUrl: `/api/download?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(`Reddit_${videoId}.mp4`)}`,
          },
        ],
        fetchedAt: new Date().toISOString(),
      };
    }

    // Normalized post URL
    let jsonUrl = url.split('?')[0];
    if (!jsonUrl.endsWith('.json')) {
      jsonUrl = jsonUrl.replace(/\/$/, '') + '.json';
    }

    let jsonRes: Response;
    try {
      jsonRes = await fetch(jsonUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0 OmniMedia/1.0',
        },
        signal: AbortSignal.timeout(8000),
      });
    } catch (err) {
      throw new ExtractionError(
        'FETCH_FAILED',
        'Could not communicate with Reddit public service.',
        { details: (err as Error).message }
      );
    }

    if (!jsonRes.ok) {
      if (jsonRes.status === 404) {
        throw new ExtractionError('DELETED_POST', 'The specified Reddit post was deleted or does not exist.', { officialUrl: url });
      }
      if (jsonRes.status === 403) {
        throw new ExtractionError('PRIVATE_CONTENT', 'This Reddit post belongs to a private subreddit or is restricted.', { officialUrl: url });
      }
      throw new ExtractionError('API_UNAVAILABLE', `Reddit API returned HTTP ${jsonRes.status}`, { officialUrl: url });
    }

    const data = await jsonRes.json();
    if (!Array.isArray(data) || !data[0]?.data?.children?.[0]?.data) {
      throw new ExtractionError('NO_MEDIA_FOUND', 'Unable to parse Reddit post structure.', { officialUrl: url });
    }

    const post = data[0].data.children[0].data;
    const title = post.title || 'Reddit Post';
    const author = post.author ? `u/${post.author}` : undefined;
    const subreddit = post.subreddit_name_prefixed || 'r/reddit';
    const cleanTitle = sanitizeFilename(`${subreddit}_${title}`.substring(0, 60), 'Reddit_Media');

    let mediaType: MediaType = 'image';
    let thumbnailUrl = post.thumbnail && post.thumbnail.startsWith('http') ? post.thumbnail : '';
    const formats: MediaFormatOption[] = [];
    const gallery: GalleryItem[] = [];

    // Check if Reddit Native Video
    if (post.is_video && post.media?.reddit_video) {
      mediaType = 'video';
      const rv = post.media.reddit_video;
      const fallbackUrl = rv.fallback_url as string;
      const height = rv.height || 720;
      const duration = rv.duration || 0;

      if (!thumbnailUrl && post.preview?.images?.[0]?.source?.url) {
        thumbnailUrl = post.preview.images[0].source.url.replace(/&amp;/g, '&');
      }

      // Add high resolution
      formats.push({
        id: 'reddit-video-hd',
        label: `Video (${height}p MP4)`,
        format: 'mp4',
        quality: `${height}p HD`,
        downloadUrl: `/api/download?url=${encodeURIComponent(fallbackUrl)}&filename=${encodeURIComponent(cleanTitle + '.mp4')}`,
        hasAudio: false,
      });

      // Audio track if available
      const audioUrl = fallbackUrl.replace(/DASH_\d+\.mp4.*/, 'DASH_AUDIO_128.mp4');
      formats.push({
        id: 'reddit-audio',
        label: 'Audio Track (M4A / MP3)',
        format: 'm4a',
        quality: '128 kbps',
        downloadUrl: `/api/download?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(cleanTitle + '_audio.m4a')}`,
      });

      return {
        id: `reddit-${post.id}`,
        originalUrl: url,
        canonicalUrl: `https://reddit.com${post.permalink}`,
        platform: 'reddit',
        platformName: 'Reddit',
        title,
        author: {
          name: author || subreddit,
          username: author,
          profileUrl: `https://reddit.com/${author || subreddit}`,
        },
        mediaType: 'video',
        thumbnailUrl,
        duration,
        durationFormatted: formatDuration(duration),
        viewCount: post.ups,
        formats,
        officialViewUrl: `https://reddit.com${post.permalink}`,
        fetchedAt: new Date().toISOString(),
      };
    }

    // Check if Reddit Gallery (multiple images)
    if (post.is_gallery && post.gallery_data?.items && post.media_metadata) {
      mediaType = 'gallery';
      for (const item of post.gallery_data.items) {
        const meta = post.media_metadata[item.media_id];
        if (meta && meta.s) {
          const rawUrl = meta.s.u ? meta.s.u.replace(/&amp;/g, '&') : meta.s.gif?.replace(/&amp;/g, '&');
          if (rawUrl) {
            gallery.push({
              id: item.media_id,
              type: meta.e === 'AnimatedImage' ? 'video' : 'image',
              url: `/api/download?url=${encodeURIComponent(rawUrl)}&filename=${encodeURIComponent(`${cleanTitle}_${item.media_id}.jpg`)}`,
              thumbnailUrl: rawUrl,
              width: meta.s.x,
              height: meta.s.y,
              format: meta.m?.split('/')[1] || 'jpg',
            });
          }
        }
      }

      if (gallery.length > 0) {
        thumbnailUrl = gallery[0].thumbnailUrl || '';
        // Add format options for individual downloads or primary
        formats.push({
          id: 'reddit-gallery-first',
          label: `Primary Image (${gallery.length} in Gallery)`,
          format: 'jpg',
          quality: 'Original Resolution',
          downloadUrl: gallery[0].url,
        });
      }

      return {
        id: `reddit-${post.id}`,
        originalUrl: url,
        canonicalUrl: `https://reddit.com${post.permalink}`,
        platform: 'reddit',
        platformName: 'Reddit',
        title,
        author: {
          name: author || subreddit,
          username: author,
          profileUrl: `https://reddit.com/${author || subreddit}`,
        },
        mediaType: 'gallery',
        thumbnailUrl,
        formats,
        gallery,
        officialViewUrl: `https://reddit.com${post.permalink}`,
        fetchedAt: new Date().toISOString(),
      };
    }

    // Check single image / direct media link in post
    const destUrl = post.url_overridden_by_dest || post.url;
    if (destUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(destUrl)) {
      const ext = destUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)?.[1]?.toLowerCase() || 'jpg';
      mediaType = ext === 'gif' ? 'video' : 'image';
      thumbnailUrl = destUrl;

      formats.push({
        id: 'reddit-single-media',
        label: `High-Res ${ext.toUpperCase()}`,
        format: ext,
        quality: 'Original Resolution',
        downloadUrl: `/api/download?url=${encodeURIComponent(destUrl)}&filename=${encodeURIComponent(cleanTitle + '.' + ext)}`,
      });

      return {
        id: `reddit-${post.id}`,
        originalUrl: url,
        canonicalUrl: `https://reddit.com${post.permalink}`,
        platform: 'reddit',
        platformName: 'Reddit',
        title,
        author: {
          name: author || subreddit,
          username: author,
          profileUrl: `https://reddit.com/${author || subreddit}`,
        },
        mediaType,
        thumbnailUrl,
        formats,
        officialViewUrl: `https://reddit.com${post.permalink}`,
        fetchedAt: new Date().toISOString(),
      };
    }

    // If external link (e.g. gfycat, imgur) or preview exists
    if (post.preview?.images?.[0]?.source?.url) {
      const sourceUrl = post.preview.images[0].source.url.replace(/&amp;/g, '&');
      thumbnailUrl = sourceUrl;
      formats.push({
        id: 'reddit-preview-image',
        label: 'Source Image (Preview)',
        format: 'jpg',
        quality: 'Max Resolution',
        downloadUrl: `/api/download?url=${encodeURIComponent(sourceUrl)}&filename=${encodeURIComponent(cleanTitle + '.jpg')}`,
      });

      return {
        id: `reddit-${post.id}`,
        originalUrl: url,
        canonicalUrl: `https://reddit.com${post.permalink}`,
        platform: 'reddit',
        platformName: 'Reddit',
        title,
        author: {
          name: author || subreddit,
        },
        mediaType: 'image',
        thumbnailUrl,
        formats,
        officialViewUrl: `https://reddit.com${post.permalink}`,
        fetchedAt: new Date().toISOString(),
      };
    }

    throw new ExtractionError(
      'NO_MEDIA_FOUND',
      'This Reddit post contains text only and does not contain downloadable media.',
      { officialUrl: `https://reddit.com${post.permalink}` }
    );
  }
}

