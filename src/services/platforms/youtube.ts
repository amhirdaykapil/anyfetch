import { MediaFormatOption, MediaResult, MediaType } from '@/types/media';
import { ExtractionError, PlatformAdapter } from './base';
import { sanitizeFilename } from '@/lib/security';
import { decodeHtmlEntities } from '@/lib/html-entities';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const PYTHON_BIN =
    process.env.PYTHON_PATH ||
    'E:\\Users\\itsbe\\AppData\\Local\\Programs\\Python\\Python312\\python.exe';

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
        if (!videoId || !/^[a-zA-Z0-9_-]{6,15}$/.test(videoId)) {
            throw new ExtractionError(
                'INVALID_URL',
                'Could not locate a valid YouTube video ID in this link.',
                { officialUrl: url }
            );
        }

        const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const isShorts = url.includes('/shorts/');

        // Prepare guaranteed thumbnail URLs
        const hqThumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        const mqThumbnail = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
        const maxResThumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

        // Check if maxresdefault exists
        let hasMaxRes = false;
        try {
            const headCheck = await fetch(maxResThumbnail, {
                method: 'HEAD',
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(3000),
            });
            if (headCheck.ok) {
                hasMaxRes = true;
            }
        } catch {
            hasMaxRes = false;
        }

        const primaryThumbnail = hasMaxRes ? maxResThumbnail : hqThumbnail;

        // Step 1: Execute yt-dlp metadata extraction with android,web player clients
        let ytDlpData: any = null;
        try {
            const { stdout } = await execFileAsync(
                PYTHON_BIN,
                [
                    '-m',
                    'yt_dlp',
                    '--extractor-args',
                    'youtube:player_client=android,web',
                    '-J',
                    '--no-warnings',
                    '--no-playlist',
                    canonicalUrl,
                ],
                {
                    timeout: 15000,
                    maxBuffer: 15 * 1024 * 1024,
                }
            );
            ytDlpData = JSON.parse(stdout);
        } catch {
            // Attempt fallback with 'python' command
            try {
                const { stdout } = await execFileAsync(
                    'python',
                    [
                        '-m',
                        'yt_dlp',
                        '--extractor-args',
                        'youtube:player_client=android,web',
                        '-J',
                        '--no-warnings',
                        '--no-playlist',
                        canonicalUrl,
                    ],
                    {
                        timeout: 12000,
                        maxBuffer: 15 * 1024 * 1024,
                    }
                );
                ytDlpData = JSON.parse(stdout);
            } catch {
                // Will fall back to oEmbed below
            }
        }

        // Step 2: Fallback to oEmbed if yt-dlp failed to get metadata
        let title = ytDlpData?.title;
        let authorName = ytDlpData?.uploader || ytDlpData?.channel;
        let authorUrl = ytDlpData?.uploader_url || ytDlpData?.channel_url;
        let duration = ytDlpData?.duration;
        let viewCount = ytDlpData?.view_count;

        if (!title) {
            try {
                const oembedRes = await fetch(
                    `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`,
                    {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OmniFetch/2.0' },
                        signal: AbortSignal.timeout(6000),
                    }
                );
                if (oembedRes.ok) {
                    const oembedData = await oembedRes.json();
                    title = oembedData.title;
                    authorName = oembedData.author_name;
                    authorUrl = oembedData.author_url;
                } else if (oembedRes.status === 404) {
                    throw new ExtractionError('DELETED_POST', 'This YouTube video is unavailable or was made private.', {
                        officialUrl: canonicalUrl,
                    });
                }
            } catch (err) {
                if (err instanceof ExtractionError) throw err;
            }
        }

        const safeTitle = decodeHtmlEntities(title || (isShorts ? `YouTube Shorts (${videoId})` : `YouTube Video (${videoId})`));
        const cleanTitle = sanitizeFilename(safeTitle.substring(0, 60), `YouTube_${videoId}`);

        // Separate thumbnails list (never confused with video formats)
        const thumbnails: MediaFormatOption[] = [];
        if (hasMaxRes) {
            thumbnails.push({
                id: 'yt-thumb-max',
                label: 'Ultra HD Thumbnail (1080p JPG)',
                format: 'jpg',
                quality: '1920x1080 Ultra HD',
                resolution: '1920x1080',
                downloadUrl: `/api/download?url=${encodeURIComponent(maxResThumbnail)}&filename=${encodeURIComponent(`${cleanTitle}_1080p_thumb.jpg`)}`,
                category: 'thumbnail',
            });
        }
        thumbnails.push({
            id: 'yt-thumb-hq',
            label: 'High Quality Thumbnail (640x480 JPG)',
            format: 'jpg',
            quality: '640x480 HQ',
            resolution: '640x480',
            downloadUrl: `/api/download?url=${encodeURIComponent(hqThumbnail)}&filename=${encodeURIComponent(`${cleanTitle}_hq_thumb.jpg`)}`,
            category: 'thumbnail',
        });
        thumbnails.push({
            id: 'yt-thumb-mq',
            label: 'Medium Quality Thumbnail (320x180 JPG)',
            format: 'jpg',
            quality: '320x180 MQ',
            resolution: '320x180',
            downloadUrl: `/api/download?url=${encodeURIComponent(mqThumbnail)}&filename=${encodeURIComponent(`${cleanTitle}_mq_thumb.jpg`)}`,
            category: 'thumbnail',
        });

        // Step 3: Build REAL video formats from yt-dlp streams
        const formats: MediaFormatOption[] = [];
        const seenHeights = new Set<number>();

        if (ytDlpData && Array.isArray(ytDlpData.formats)) {
            // Sort formats descending by resolution
            const rawFormats = ytDlpData.formats as any[];

            // Collect video streams
            for (const f of rawFormats) {
                const height = f.height;
                if (!height || typeof height !== 'number' || height < 144) continue;
                if (seenHeights.has(height)) continue;

                // Priority resolutions to display
                if ([2160, 1440, 1080, 720, 480, 360, 240].includes(height) || isShorts) {
                    seenHeights.add(height);

                    const label =
                        height >= 2160
                            ? `4K Ultra HD Video (${height}p MP4)`
                            : height >= 1440
                                ? `2K Quad HD Video (${height}p MP4)`
                                : height >= 1080
                                    ? `Full HD Video (${height}p MP4)`
                                    : height >= 720
                                        ? `HD Video (${height}p MP4)`
                                        : `Standard Video (${height}p MP4)`;

                    const exactOrApproxSize = (typeof f.filesize === 'number' && f.filesize > 0)
                        ? f.filesize
                        : (typeof f.filesize_approx === 'number' && f.filesize_approx > 0)
                            ? f.filesize_approx
                            : (duration && f.tbr ? Math.round((duration * f.tbr * 1024) / 8) : undefined);

                    const estimatedBitrateKbps =
                        height >= 2160 ? 15000 :
                            height >= 1440 ? 8000 :
                                height >= 1080 ? 4000 :
                                    height >= 720 ? 2000 :
                                        height >= 480 ? 1000 : 500;

                    const computedSize = exactOrApproxSize || (duration ? Math.round((duration * estimatedBitrateKbps * 1024) / 8) : 15 * 1024 * 1024);

                    formats.push({
                        id: `yt-video-${height}`,
                        label,
                        format: 'mp4',
                        quality: `${height}p ${height >= 720 ? 'HD' : 'SD'} with Audio`,
                        resolution: f.width && f.height ? `${f.width}x${f.height}` : `${height}p`,
                        fileSize: computedSize,
                        fileSizeFormatted: computedSize ? `${(computedSize / 1024 / 1024).toFixed(1)} MB` : undefined,
                        downloadUrl: `/api/download?type=yt_stream&videoId=${videoId}&quality=${height}&size=${computedSize}&filename=${encodeURIComponent(`${cleanTitle}_${height}p.mp4`)}`,
                        hasAudio: true,
                        category: 'video',
                    });
                }
            }

            // Sort video formats descending by height
            formats.sort((a, b) => {
                const hA = parseInt(a.quality, 10) || 0;
                const hB = parseInt(b.quality, 10) || 0;
                return hB - hA;
            });

            // Add Audio extraction option with accurate size
            const audioSize = Math.round(duration ? (duration * 128 * 1024) / 8 : 4 * 1024 * 1024);
            formats.push({
                id: 'yt-audio-mp3',
                label: 'Extracted Master Audio (MP3)',
                format: 'mp3',
                quality: 'High Bitrate Audio',
                fileSize: audioSize,
                fileSizeFormatted: `${(audioSize / 1024 / 1024).toFixed(1)} MB`,
                downloadUrl: `/api/download?type=yt_stream&videoId=${videoId}&quality=audio&size=${audioSize}&filename=${encodeURIComponent(`${cleanTitle}_audio.mp3`)}`,
                hasAudio: true,
                category: 'audio',
            });
        }

        const isPartiallyRestricted = false;

        return {
            id: `youtube-${videoId}`,
            originalUrl: url,
            canonicalUrl,
            platform: 'youtube',
            platformName: isShorts ? 'YouTube Shorts' : 'YouTube',
            title: safeTitle,
            author: authorName
                ? {
                    name: authorName,
                    profileUrl: authorUrl,
                }
                : undefined,
            mediaType: 'video',
            thumbnailUrl: primaryThumbnail,
            duration,
            durationFormatted: duration
                ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
                : undefined,
            viewCount,
            formats,
            thumbnails,
            isPartiallyRestricted: false,
            complianceNotice: 'In compliance with YouTube Terms of Service, stream extraction is provided with audio-video merging where authorized.',
            officialViewUrl: canonicalUrl,
            fetchedAt: new Date().toISOString(),
        };
    }
}
