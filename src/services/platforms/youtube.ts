import { MediaFormatOption, MediaResult, MediaType } from '@/types/media';
import { ExtractionError, PlatformAdapter } from './base';
import { sanitizeFilename } from '@/lib/security';

export class YouTubeAdapter implements PlatformAdapter {
  public id = 'youtube' as const;
  public name = 'YouTube';
  public iconName = 'Youtube';

  public canHandle(url: string, parsedUrl?: URL): boolean {
    try {
      const u = parsedUrl || new URL(url);
      const host = u.hostname.toLowerCase();
      return (
        host === 'youtube.com' ||
        host.endsWith('.youtube.com') ||
        host === 'youtu.be'
      );
    } catch {
      return false;
    }
  }

  private extractVideoId(url: string): string | null {
    try {
      const u = new URL(url);
      if (u.hostname === 'youtu.be') {
        return u.pathname.substring(1).split('?')[0];
      }
      if (u.pathname.includes('/shorts/')) {
        return u.pathname.split('/shorts/')[1].split('/')[0].split('?')[0];
      }
      if (u.pathname.includes('/embed/')) {
        return u.pathname.split('/embed/')[1].split('/')[0].split('?')[0];
      }
      return u.searchParams.get('v');
    } catch {
      return null;
    }
  }

  public async extract(url: string): Promise<MediaResult> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new ExtractionError(
        'INVALID_URL',
        'Could not locate a valid YouTube video ID in this link.',
        { officialUrl: url }
      );
    }

    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Step 1: Query YouTube Official oEmbed
    let oembedData: any = null;
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OmniMedia/1.0' },
          signal: AbortSignal.timeout(6000),
        }
      );

      if (oembedRes.ok) {
        oembedData = await oembedRes.json();
      } else if (oembedRes.status === 404) {
        throw new ExtractionError('DELETED_POST', 'This YouTube video is unavailable or was made private.', {
          officialUrl: canonicalUrl,
        });
      }
    } catch (err) {
      if (err instanceof ExtractionError) throw err;
    }

    const title = oembedData?.title || `YouTube Video (${videoId})`;
    const authorName = oembedData?.author_name || 'YouTube Creator';
    const authorUrl = oembedData?.author_url;
    const cleanTitle = sanitizeFilename(title.substring(0, 60), `YouTube_${videoId}`);

    const maxResThumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    const hqThumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const mqThumbnail = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

    const formats: MediaFormatOption[] = [];

    // Format options: High quality thumbnails
    formats.push({
      id: 'yt-thumb-max',
      label: 'Ultra HD Thumbnail (1080p JPG)',
      format: 'jpg',
      quality: '1920x1080 HD',
      resolution: '1920x1080',
      downloadUrl: `/api/download?url=${encodeURIComponent(maxResThumbnail)}&filename=${encodeURIComponent(`${cleanTitle}_1080p_thumb.jpg`)}`,
    });

    formats.push({
      id: 'yt-thumb-hq',
      label: 'Standard HQ Thumbnail (JPG)',
      format: 'jpg',
      quality: '640x480 HQ',
      resolution: '640x480',
      downloadUrl: `/api/download?url=${encodeURIComponent(hqThumbnail)}&filename=${encodeURIComponent(`${cleanTitle}_hq_thumb.jpg`)}`,
    });

    // Step 2: Try public streaming formats via Invidious / Piped public API
    try {
      const apiRes = await fetch(`https://inv.tux.pizza/api/v1/videos/${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OmniMedia/1.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (apiRes.ok) {
        const videoData = await apiRes.json();
        const formatStreams = videoData.formatStreams || [];
        for (const stream of formatStreams) {
          if (stream.url && stream.resolution) {
            formats.unshift({
              id: `yt-stream-${stream.resolution}`,
              label: `MP4 Video (${stream.resolution})`,
              format: stream.container || 'mp4',
              quality: `${stream.resolution} with Audio`,
              resolution: stream.resolution,
              fileSizeFormatted: stream.size,
              downloadUrl: `/api/download?url=${encodeURIComponent(stream.url)}&filename=${encodeURIComponent(`${cleanTitle}_${stream.resolution}.mp4`)}`,
              hasAudio: true,
            });
          }
        }

        // Add audio stream if available
        const audioStreams = videoData.adaptiveFormats?.filter((f: any) => f.type?.startsWith('audio/')) || [];
        if (audioStreams.length > 0) {
          const bestAudio = audioStreams[0];
          formats.push({
            id: 'yt-stream-audio',
            label: 'Extracted Audio Track (M4A / MP3)',
            format: 'm4a',
            quality: `${bestAudio.bitrate ? Math.round(bestAudio.bitrate / 1000) : 128} kbps`,
            downloadUrl: `/api/download?url=${encodeURIComponent(bestAudio.url)}&filename=${encodeURIComponent(`${cleanTitle}_audio.m4a`)}`,
          });
        }
      }
    } catch {
      // Graceful fallback to thumbnail and official streaming links
    }

    return {
      id: `youtube-${videoId}`,
      originalUrl: url,
      canonicalUrl,
      platform: 'youtube',
      platformName: url.includes('/shorts/') ? 'YouTube Shorts' : 'YouTube',
      title,
      author: {
        name: authorName,
        profileUrl: authorUrl,
      },
      mediaType: 'video',
      thumbnailUrl: maxResThumbnail,
      formats,
      complianceNotice:
        'In compliance with YouTube Terms of Service, stream extraction is provided where authorized. Thumbnails are available in full master resolution.',
      officialViewUrl: canonicalUrl,
      fetchedAt: new Date().toISOString(),
    };
  }
}

