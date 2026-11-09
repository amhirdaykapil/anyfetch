import { MediaFormatOption, MediaResult, MediaType } from '@/types/media';
import { ExtractionError, PlatformAdapter } from './base';
import { sanitizeFilename } from '@/lib/security';

export class InstagramAdapter implements PlatformAdapter {
  public id = 'instagram' as const;
  public name = 'Instagram';
  public iconName = 'Instagram';

  public canHandle(url: string, parsedUrl?: URL): boolean {
    try {
      const u = parsedUrl || new URL(url);
      const host = u.hostname.toLowerCase();
      return host === 'instagram.com' || host.endsWith('.instagram.com');
    } catch {
      return false;
    }
  }

  private extractShortcode(url: string): string | null {
    const match = url.match(/\/(p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);
    return match ? match[2] : null;
  }

  public async extract(url: string): Promise<MediaResult> {
    const shortcode = this.extractShortcode(url);
    if (!shortcode) {
      throw new ExtractionError(
        'INVALID_URL',
        'Invalid Instagram URL. Please provide a link to a public post or Reel.',
        { officialUrl: url }
      );
    }

    const canonicalUrl = `https://www.instagram.com/p/${shortcode}/`;
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;

    let html = '';
    try {
      const res = await fetch(embedUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new ExtractionError('DELETED_POST', 'This Instagram post does not exist or has been deleted.', {
            officialUrl: canonicalUrl,
          });
        }
        throw new ExtractionError('RESTRICTED_CONTENT', 'This Instagram post is private or region-restricted.', {
          officialUrl: canonicalUrl,
        });
      }

      html = await res.text();
    } catch (err) {
      if (err instanceof ExtractionError) throw err;
      throw new ExtractionError('FETCH_FAILED', 'Failed to fetch Instagram public embed.', {
        details: (err as Error).message,
        officialUrl: canonicalUrl,
      });
    }

    // Check if login wall
    if (html.includes('Login • Instagram') || html.includes('Page Not Found')) {
      throw new ExtractionError(
        'PRIVATE_CONTENT',
        'This post belongs to a private account or requires authentication to view.',
        { officialUrl: canonicalUrl }
      );
    }

    // Extract author
    let authorName = 'Instagram Creator';
    const authorMatch = html.match(/class=["']Username["'][^>]*>([^<]+)</i) ||
                        html.match(/class=["']HoverCard["'][^>]*>([^<]+)</i);
    if (authorMatch && authorMatch[1]) {
      authorName = authorMatch[1].trim();
    }

    // Extract caption / title
    let title = `Instagram post by ${authorName}`;
    const captionMatch = html.match(/class=["']Caption["'][^>]*>([\s\S]*?)<\/div>/i);
    if (captionMatch && captionMatch[1]) {
      const text = captionMatch[1].replace(/<[^>]+>/g, '').trim();
      if (text) title = text;
    }

    // Extract image
    let imageUrl = '';
    const imgMatch = html.match(/class=["']EmbeddedMediaImage["'][^>]*src=["']([^"']+)["']/i) ||
                     html.match(/<img[^>]*class=["'][^"']*ContentImage[^"']*["'][^>]*src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      imageUrl = imgMatch[1].replace(/&amp;/g, '&');
    }

    // Extract video if present
    let videoUrl = '';
    const vidMatch = html.match(/<video[^>]*src=["']([^"']+)["']/i) ||
                     html.match(/"video_url":\s*"([^"]+)"/i);
    if (vidMatch && vidMatch[1]) {
      videoUrl = vidMatch[1].replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
    }

    if (!imageUrl && !videoUrl) {
      throw new ExtractionError(
        'RESTRICTED_CONTENT',
        'Could not retrieve downloadable media for this post. It may be restricted by Instagram API controls.',
        { officialUrl: canonicalUrl }
      );
    }

    const cleanTitle = sanitizeFilename(title.substring(0, 50), `Instagram_${shortcode}`);
    const formats: MediaFormatOption[] = [];
    const isVideo = Boolean(videoUrl || url.includes('/reel'));

    if (videoUrl) {
      formats.push({
        id: 'ig-video-hd',
        label: 'Reel / Video (HD MP4)',
        format: 'mp4',
        quality: 'High Definition',
        downloadUrl: `/api/download?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(`${cleanTitle}.mp4`)}`,
        hasAudio: true,
      });
    }

    if (imageUrl) {
      formats.push({
        id: 'ig-photo-hd',
        label: isVideo ? 'Cover Poster (JPG)' : 'High Resolution Photo (JPG)',
        format: 'jpg',
        quality: 'Original Resolution',
        downloadUrl: `/api/download?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(`${cleanTitle}.jpg`)}`,
      });
    }

    return {
      id: `instagram-${shortcode}`,
      originalUrl: url,
      canonicalUrl,
      platform: 'instagram',
      platformName: isVideo ? 'Instagram Reel' : 'Instagram',
      title,
      author: {
        name: authorName,
        username: `@${authorName}`,
        profileUrl: `https://instagram.com/${authorName}`,
      },
      mediaType: isVideo ? 'video' : 'image',
      thumbnailUrl: imageUrl || videoUrl,
      formats,
      complianceNotice:
        'Only publicly accessible Instagram content is downloadable in accordance with Meta Platform Terms.',
      officialViewUrl: canonicalUrl,
      fetchedAt: new Date().toISOString(),
    };
  }
}

