import { MediaFormatOption, MediaResult, MediaType } from '@/types/media';
import { ExtractionError, PlatformAdapter } from './base';
import { sanitizeFilename } from '@/lib/security';

export class PinterestAdapter implements PlatformAdapter {
  public id = 'pinterest' as const;
  public name = 'Pinterest';
  public iconName = 'Pin';

  public canHandle(url: string, parsedUrl?: URL): boolean {
    try {
      const u = parsedUrl || new URL(url);
      const host = u.hostname.toLowerCase();
      return host === 'pinterest.com' || host.endsWith('.pinterest.com') || host === 'pin.it';
    } catch {
      return false;
    }
  }

  public async extract(url: string): Promise<MediaResult> {
    let targetUrl = url;

    // Follow redirect for short pin.it URLs
    if (url.includes('pin.it')) {
      try {
        const head = await fetch(url, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(6000),
        });
        targetUrl = head.url;
      } catch {
        // Fall back to original URL
      }
    }

    let title = 'Pinterest Pin';
    let authorName = 'Pinterest Creator';
    let authorUrl = '';
    let ogImage = '';
    let ogVideo = '';

    // Step 1: Try Pinterest oEmbed
    try {
      const oembedUrl = `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(targetUrl)}`;
      const oembedRes = await fetch(oembedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OmniMedia/1.0' },
        signal: AbortSignal.timeout(6000),
      });
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        if (oembedData.title) title = oembedData.title;
        if (oembedData.author_name) authorName = oembedData.author_name;
        if (oembedData.author_url) authorUrl = oembedData.author_url;
        if (oembedData.thumbnail_url) ogImage = oembedData.thumbnail_url;
      }
    } catch {
      // Ignore and proceed to HTML parse
    }

    // Step 2: Fetch public HTML to discover original image / video
    try {
      const htmlRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (htmlRes.ok) {
        const html = await htmlRes.text();

        // Extract og:image
        const imgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                         html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i);
        if (imgMatch && imgMatch[1]) {
          ogImage = imgMatch[1];
        }

        // Extract og:video
        const vidMatch = html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+)["']/i) ||
                         html.match(/content=["']([^"']+)["']\s+property=["']og:video["']/i) ||
                         html.match(/"contentUrl":\s*"([^"]+\.mp4[^"]*)"/i);
        if (vidMatch && vidMatch[1]) {
          ogVideo = vidMatch[1];
        }

        // Extract og:title if needed
        if (title === 'Pinterest Pin') {
          const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                             html.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].replace(/ - Pinterest$/, '').trim();
          }
        }
      }
    } catch (err) {
      if (!ogImage) {
        throw new ExtractionError('FETCH_FAILED', 'Failed to inspect Pinterest pin.', {
          details: (err as Error).message,
          officialUrl: targetUrl,
        });
      }
    }

    if (!ogImage && !ogVideo) {
      throw new ExtractionError('NO_MEDIA_FOUND', 'Could not locate downloadable media on this Pinterest pin.', {
        officialUrl: targetUrl,
      });
    }

    const cleanTitle = sanitizeFilename(title.substring(0, 50), 'Pinterest_Pin');
    const formats: MediaFormatOption[] = [];
    let mediaType: MediaType = 'image';

    if (ogVideo) {
      mediaType = 'video';
      formats.push({
        id: 'pin-video-hd',
        label: 'Pinterest Video (MP4)',
        format: 'mp4',
        quality: 'High Definition',
        downloadUrl: `/api/download?url=${encodeURIComponent(ogVideo)}&filename=${encodeURIComponent(`${cleanTitle}.mp4`)}`,
      });
    }

    if (ogImage) {
      // Pinterest original resolution trick: replace dimensions with originals
      const originalImageUrl = ogImage.replace(/\/(736x|564x|474x|236x)\//, '/originals/');

      formats.push({
        id: 'pin-img-orig',
        label: 'Original Pristine Resolution (JPG)',
        format: 'jpg',
        quality: 'Original Resolution',
        downloadUrl: `/api/download?url=${encodeURIComponent(originalImageUrl)}&filename=${encodeURIComponent(`${cleanTitle}_original.jpg`)}`,
      });

      formats.push({
        id: 'pin-img-standard',
        label: 'Standard Preview (JPG)',
        format: 'jpg',
        quality: 'Standard 736p',
        downloadUrl: `/api/download?url=${encodeURIComponent(ogImage)}&filename=${encodeURIComponent(`${cleanTitle}.jpg`)}`,
      });
    }

    return {
      id: `pinterest-${Buffer.from(targetUrl).toString('base64url').substring(0, 16)}`,
      originalUrl: url,
      canonicalUrl: targetUrl,
      platform: 'pinterest',
      platformName: 'Pinterest',
      title,
      author: {
        name: authorName,
        profileUrl: authorUrl || undefined,
      },
      mediaType,
      thumbnailUrl: ogImage,
      formats,
      officialViewUrl: targetUrl,
      fetchedAt: new Date().toISOString(),
    };
  }
}

