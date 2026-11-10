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

        const isExplicitVideo =
            targetUrl.includes('/watch') ||
            targetUrl.includes('/reel') ||
            targetUrl.includes('/videos/') ||
            targetUrl.includes('fb.watch');

        // Step 1: Use yt-dlp for reliable video metadata and direct stream extraction
        let ytDlpData: any = null;
        try {
            const { stdout } = await execFileAsync(
                PYTHON_BIN,
                ['-m', 'yt_dlp', '-J', '--no-warnings', '--no-playlist', targetUrl],
                {
                    timeout: 15000,
                    maxBuffer: 15 * 1024 * 1024,
                }
            );
            ytDlpData = JSON.parse(stdout);
        } catch {
            // Fallback with generic python command
            try {
                const { stdout } = await execFileAsync(
                    'python',
                    ['-m', 'yt_dlp', '-J', '--no-warnings', '--no-playlist', targetUrl],
                    {
                        timeout: 12000,
                        maxBuffer: 15 * 1024 * 1024,
                    }
                );
                ytDlpData = JSON.parse(stdout);
            } catch {
                // Continue to public HTML fallback below
            }
        }

        if (ytDlpData) {
            const rawTitle = ytDlpData.title || (isExplicitVideo ? 'Facebook Video' : 'Facebook Post');
            const title = decodeHtmlEntities(rawTitle);
            const authorName = ytDlpData.uploader || ytDlpData.uploader_id || 'Facebook Creator';
            const duration = ytDlpData.duration ? Math.round(ytDlpData.duration) : undefined;
            const viewCount = ytDlpData.view_count;
            const primaryThumbnail = ytDlpData.thumbnail || '';
            const cleanTitle = sanitizeFilename(title.substring(0, 50), 'Facebook_Media');

            const formats: MediaFormatOption[] = [];
            const thumbnails: MediaFormatOption[] = [];

            // Add thumbnail if available
            if (primaryThumbnail) {
                thumbnails.push({
                    id: 'fb-thumb-primary',
                    label: 'Master Video Poster (JPG)',
                    format: 'jpg',
                    quality: 'High Quality Poster',
                    downloadUrl: `/api/download?url=${encodeURIComponent(primaryThumbnail)}&filename=${encodeURIComponent(`${cleanTitle}_poster.jpg`)}`,
                    category: 'thumbnail',
                });
            }

            // Check available video formats from yt-dlp
            const rawFormats = Array.isArray(ytDlpData.formats) ? ytDlpData.formats : [];

            // Prioritize progressive streams (hd, sd) that already have both video and audio
            const progressiveHd = rawFormats.find((f: any) => f.format_id === 'hd' && f.url);
            const progressiveSd = rawFormats.find((f: any) => f.format_id === 'sd' && f.url);

            if (progressiveHd) {
                formats.push({
                    id: 'fb-video-hd',
                    label: 'High Definition Video (720p MP4)',
                    format: 'mp4',
                    quality: '720p HD with Audio',
                    resolution: '1280x720',
                    downloadUrl: `/api/download?url=${encodeURIComponent(progressiveHd.url)}&filename=${encodeURIComponent(`${cleanTitle}_720p.mp4`)}`,
                    hasAudio: true,
                    category: 'video',
                });
            }

            if (progressiveSd) {
                formats.push({
                    id: 'fb-video-sd',
                    label: 'Standard Definition Video (360p MP4)',
                    format: 'mp4',
                    quality: '360p SD with Audio',
                    resolution: '640x360',
                    downloadUrl: `/api/download?url=${encodeURIComponent(progressiveSd.url)}&filename=${encodeURIComponent(`${cleanTitle}_360p.mp4`)}`,
                    hasAudio: true,
                    category: 'video',
                });
            }

            // If no named progressive formats, look for any direct mp4 formats
            if (formats.length === 0) {
                const directMp4s = rawFormats.filter((f: any) => f.ext === 'mp4' && f.url && f.vcodec !== 'none');
                for (const f of directMp4s.slice(0, 2)) {
                    const height = f.height || 720;
                    formats.push({
                        id: `fb-video-${f.format_id || height}`,
                        label: `Facebook Video (${height}p MP4)`,
                        format: 'mp4',
                        quality: `${height}p`,
                        downloadUrl: `/api/download?url=${encodeURIComponent(f.url)}&filename=${encodeURIComponent(`${cleanTitle}_${height}p.mp4`)}`,
                        hasAudio: Boolean(f.acodec && f.acodec !== 'none'),
                        category: 'video',
                    });
                }
            }

            return {
                id: `facebook-${ytDlpData.id || Buffer.from(targetUrl).toString('base64url').substring(0, 16)}`,
                originalUrl: url,
                canonicalUrl: targetUrl,
                platform: 'facebook',
                platformName: isExplicitVideo ? 'Facebook Video' : 'Facebook',
                title,
                author: {
                    name: authorName,
                },
                mediaType: 'video',
                thumbnailUrl: primaryThumbnail,
                duration,
                durationFormatted: duration
                    ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
                    : undefined,
                viewCount,
                formats,
                thumbnails: thumbnails.length > 0 ? thumbnails : undefined,
                complianceNotice:
                    'In compliance with Facebook Terms, public video extraction is provided where authorized. Creator rights and copyright permissions apply.',
                officialViewUrl: targetUrl,
                fetchedAt: new Date().toISOString(),
            };
        }

        // Step 2: Fallback to public HTML & oEmbed
        let title = isExplicitVideo ? 'Facebook Video' : 'Facebook Post';
        let authorName = 'Facebook Page';
        let ogImage = '';
        let ogVideo = '';

        try {
            const oembedRes = await fetch(
                `https://www.facebook.com/plugins/video/oembed.json/?url=${encodeURIComponent(targetUrl)}`,
                {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OmniFetch/2.0' },
                    signal: AbortSignal.timeout(6000),
                }
            );

            if (oembedRes.ok) {
                const data = await oembedRes.json();
                if (data.title) title = decodeHtmlEntities(data.title);
                if (data.author_name) authorName = decodeHtmlEntities(data.author_name);
            }
        } catch {
            // Ignore
        }

        try {
            const htmlRes = await fetch(targetUrl, {
                headers: {
                    'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                signal: AbortSignal.timeout(7000),
            });

            if (htmlRes.ok) {
                const html = await htmlRes.text();

                const imgMatch =
                    html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                    html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i);
                if (imgMatch && imgMatch[1]) ogImage = imgMatch[1];

                const vidMatch =
                    html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+)["']/i) ||
                    html.match(/<meta\s+property=["']og:video:url["']\s+content=["']([^"']+)["']/i) ||
                    html.match(/hd_src:"([^"]+)"/i) ||
                    html.match(/sd_src:"([^"]+)"/i);
                if (vidMatch && vidMatch[1]) ogVideo = vidMatch[1].replace(/\\u0026/g, '&');

                const titleMatch =
                    html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                    html.match(/content=["']([^"']+)["']\s+property=["']og:title["']/i);
                if (titleMatch && titleMatch[1]) title = decodeHtmlEntities(titleMatch[1]);
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
        const thumbnails: MediaFormatOption[] = [];
        const isVideo = isExplicitVideo || Boolean(ogVideo);

        if (ogVideo) {
            formats.push({
                id: 'fb-video-hd',
                label: 'Facebook Video (MP4)',
                format: 'mp4',
                quality: 'High Definition',
                downloadUrl: `/api/download?url=${encodeURIComponent(ogVideo)}&filename=${encodeURIComponent(`${cleanTitle}.mp4`)}`,
                hasAudio: true,
                category: 'video',
            });
        }

        if (ogImage) {
            if (isVideo) {
                thumbnails.push({
                    id: 'fb-image-poster',
                    label: 'Cover Poster (JPG)',
                    format: 'jpg',
                    quality: 'Original Quality',
                    downloadUrl: `/api/download?url=${encodeURIComponent(ogImage)}&filename=${encodeURIComponent(`${cleanTitle}_poster.jpg`)}`,
                    category: 'thumbnail',
                });
            } else {
                formats.push({
                    id: 'fb-image-hq',
                    label: 'High Quality Photo (JPG)',
                    format: 'jpg',
                    quality: 'Original Quality',
                    downloadUrl: `/api/download?url=${encodeURIComponent(ogImage)}&filename=${encodeURIComponent(`${cleanTitle}.jpg`)}`,
                    category: 'image',
                });
            }
        }

        return {
            id: `facebook-${Buffer.from(targetUrl).toString('base64url').substring(0, 16)}`,
            originalUrl: url,
            canonicalUrl: targetUrl,
            platform: 'facebook',
            platformName: isVideo ? 'Facebook Video' : 'Facebook',
            title,
            author: {
                name: authorName,
            },
            mediaType: isVideo ? 'video' : 'image',
            thumbnailUrl: ogImage || ogVideo,
            formats,
            thumbnails: thumbnails.length > 0 ? thumbnails : undefined,
            complianceNotice:
                'Downloads of public Facebook media are subject to copyright policies and creator permissions.',
            officialViewUrl: targetUrl,
            fetchedAt: new Date().toISOString(),
        };
    }
}
