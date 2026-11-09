import { MediaFormatOption, MediaResult, MediaType } from '@/types/media';
import { ExtractionError, PlatformAdapter } from './base';
import { sanitizeFilename } from '@/lib/security';

export class FacebookAdapter implements PlatformAdapter {
  public id = 'facebook' as const;
  public name = 'Facebook';
  public iconName = 'Share2';

  public canHandle(url: string, parsedUrl?: URL): boolean {
    try {
      const u = parsedUrl || new URL(url);
      const host = u.hostname.toLowerCase();
      return (
        host === 'facebook.com' ||
        host.endsWith('.facebook.com') ||
        host === 'fb.watch' ||
        host === 'fb.me'
      );
    } catch {
      return false;
    }
  }

  public async extract(url: string): Promise<MediaResult> {
    let targetUrl = url;

    // Follow redirect for short fb.watch / fb.me
    if (url.includes('fb.watch') || url.includes('fb.me')) {
      try {
        const head = await fetch(url, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(6000),
        });
        targetUrl = head.url;
      } catch {
        // Fall back
      }
    }

    let title = 'Facebook Video';
    let authorName = 'Facebook Page';
    let ogImage = '';
    let ogVideo = '';

    // Step 1: Query Facebook video oEmbed
    try {
      const oembedRes = await fetch(
        `https://www.facebook.com/plugins/video/oembed.json/?url=${encodeURIComponent(targetUrl)}`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OmniMedia/1.0' },
          signal: AbortSignal.timeout(6000),
        }
      );

      if (oembedRes.ok) {
        const data = await oembedRes.json();
        if (data.title) title = data.title;
        if (data.author_name) authorName = data.author_name;
      }
    } catch {
      // Ignore
    }

    // Step 2: Fetch public HTML
    try {
      const htmlRes = await fetch(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(7000),
      });

      if (htmlRes.ok) {
        const html = await htmlRes.text();

        const imgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
        if (imgMatch && imgMatch[1]) ogImage = imgMatch[1];

        const vidMatch = html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+)["']/i) ||
                         html.match(/<meta\s+property=["']og:video:url["']\s+content=["']([^"']+)["']/i) ||
                         html.match(/hd_src:"([^"]+)"/i) ||
                         html.match(/sd_src:"([^"]+)"/i);
        if (vidMatch && vidMatch[1]) ogVideo = vidMatch[1].replace(/\\u0026/g, '&');

        if (title === 'Facebook Video') {
          const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
          if (titleMatch && titleMatch[1]) title = titleMatch[1];
        }
      }
    } catch (err) {
      if (!ogImage && !ogVideo) {
        throw new ExtractionError('FETCH_FAILED', 'Failed to inspect Facebook video.', {
          details: (err as Error).message,
          officialUrl: targetUrl,
        });
      }
    }

    if (!ogImage && !ogVideo) {
      throw new ExtractionError(
        'RESTRICTED_CONTENT',
        'This Facebook content is either private, age-restricted, or removed by its author.',
        { officialUrl: targetUrl }
      );
    }

    const cleanTitle = sanitizeFilename(title.substring(0, 50), 'Facebook_Media');
    const formats: MediaFormatOption[] = [];
    const isVideo = Boolean(ogVideo);

    if (ogVideo) {
      formats.push({
        id: 'fb-video-hd',
        label: 'Facebook Video (MP4)',
        format: 'mp4',
        quality: 'High Definition',
        downloadUrl: `/api/download?url=${encodeURIComponent(ogVideo)}&filename=${encodeURIComponent(`${cleanTitle}.mp4`)}`,
        hasAudio: true,
      });
    }

    if (ogImage) {
      formats.push({
        id: 'fb-image-hq',
        label: isVideo ? 'Cover Poster (JPG)' : 'High Quality Photo (JPG)',
        format: 'jpg',
        quality: 'Original Quality',
        downloadUrl: `/api/download?url=${encodeURIComponent(ogImage)}&filename=${encodeURIComponent(`${cleanTitle}.jpg`)}`,
      });
    }

    return {
      id: `facebook-${Buffer.from(targetUrl).toString('base64url').substring(0, 16)}`,
      originalUrl: url,
      canonicalUrl: targetUrl,
      platform: 'facebook',
      platformName: 'Facebook',
      title,
      author: {
        name: authorName,
      },
      mediaType: isVideo ? 'video' : 'image',
      thumbnailUrl: ogImage || ogVideo,
      formats,
      complianceNotice:
        'Downloads of public Facebook media are subject to copyright policies and creator permissions.',
      officialViewUrl: targetUrl,
      fetchedAt: new Date().toISOString(),
    };
  }
}

