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

        // Step 1: Execute yt-dlp metadata extraction with multi-client adaptive discovery (tv_samsung, visionos, android)
        let ytDlpData: any = null;
        try {
            const { stdout } = await execFileAsync(
                PYTHON_BIN,
                [
                    '-m',
                    'yt_dlp',
                    '--extractor-args',
                    'youtube:player_client=tv_samsung,visionos,android',
                    '-J',
                    '--no-warnings',
                    '--no-playlist',
                    canonicalUrl,
                ],
                {
                    timeout: 20000,
                    maxBuffer: 25 * 1024 * 1024,
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
                        'youtube:player_client=tv_samsung,visionos,android',
                        '-J',
                        '--no-warnings',
                        '--no-playlist',
                        canonicalUrl,
                    ],
                    {
                        timeout: 18000,
                        maxBuffer: 25 * 1024 * 1024,
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
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AnyFetch/2.0' },
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

        // Step 3: Build complete progressive & adaptive video formats from yt-dlp streams
        const formats: MediaFormatOption[] = [];

        if (ytDlpData && Array.isArray(ytDlpData.formats)) {
            const rawFormats = ytDlpData.formats as any[];

                // Detect if video contains audio tracks
                const audioFormats = rawFormats.filter(
                    (f) => f.acodec && f.acodec !== 'none' && f.vcodec === 'none'
                );
                const hasAudio = audioFormats.length > 0 || rawFormats.some((f) => f.acodec && f.acodec !== 'none');

                    // Find best audio stream size for accurate merged file size calculation
                    const bestAudio = audioFormats.sort((a, b) => (b.tbr || 0) - (a.tbr || 0))[0];
                    const audioStreamSize =
                        typeof bestAudio?.filesize === 'number' && bestAudio.filesize > 0
                            ? bestAudio.filesize
                            : typeof bestAudio?.filesize_approx === 'number' && bestAudio.filesize_approx > 0
                                ? bestAudio.filesize_approx
                                : duration
                                    ? Math.round((duration * 128 * 1024) / 8)
                                    : 5 * 1024 * 1024;

                    // Collect all genuine video streams (progressive and adaptive DASH/HLS)
                    const validVideoFormats = rawFormats.filter(
                        (f) =>
                            f.vcodec &&
                            f.vcodec !== 'none' &&
                            typeof f.height === 'number' &&
                            f.height >= 144 &&
                            f.protocol !== 'mhtml'
                    );

                    // Group video streams by discrete vertical height
                    const formatsByHeight = new Map<number, any[]>();
                    for (const f of validVideoFormats) {
                        const list = formatsByHeight.get(f.height) || [];
                        list.push(f);
                        formatsByHeight.set(f.height, list);
                    }

                    // Sort unique heights strictly descending (e.g. 2160, 1440, 1080, 720, 480, 360, 240, 144)
                    const sortedHeights = Array.from(formatsByHeight.keys()).sort((a, b) => b - a);

                    for (const height of sortedHeights) {
                        const streams = formatsByHeight.get(height) || [];
                        // Select best quality stream for this resolution (prioritize native https over m3u8, then highest bitrate)
                        const bestStream = streams.sort((a, b) => {
                            const aProto = a.protocol?.startsWith('http') ? 1 : 0;
                            const bProto = b.protocol?.startsWith('http') ? 1 : 0;
                            if (aProto !== bProto) return bProto - aProto;
                            return (b.tbr || 0) - (a.tbr || 0);
                        })[0];

                        if (!bestStream) continue;

                        const width = bestStream.width;
                        const resolutionStr = width && height ? `${width}x${height}` : `${height}p`;

                        const label =
                            height >= 2160 ? `4K Ultra HD Video (${height}p MP4)`
                                : height >= 1440 ? `2K Quad HD Video (${height}p MP4)`
                                    : height >= 1080 ? `Full HD Video (${height}p MP4)`
                                        : height >= 720 ? `HD Video (${height}p MP4)`
                                            : height >= 480 ? `Standard Video (${height}p MP4)`
                                                : height >= 360 ? `Standard Video (${height}p MP4)`
                                                    : height >= 240 ? `Low Definition Video (${height}p MP4)`
                                                        : `Basic Video (${height}p MP4)`;

                        const qualityStr =
                            !hasAudio ? `${height}p Video (No Audio)`
                                : height >= 2160 ? `${height}p 4K with Audio`
                                    : height >= 1440 ? `${height}p 2K with Audio`
                                        : height >= 1080 ? `${height}p Full HD with Audio`
                                            : height >= 720 ? `${height}p HD with Audio`
                                                : `${height}p SD with Audio`;

                        // Calculate accurate file size
                        let videoSize: number | undefined;
                        if (typeof bestStream.filesize === 'number' && bestStream.filesize > 0) {
                            videoSize = bestStream.filesize;
                        } else if (typeof bestStream.filesize_approx === 'number' && bestStream.filesize_approx > 0) {
                            videoSize = bestStream.filesize_approx;
                        } else if (duration && bestStream.tbr) {
                            videoSize = Math.round((duration * bestStream.tbr * 1024) / 8);
                        }

                        // If stream already has audio (progressive), size is complete; otherwise add audio stream size
                        const isStreamCombined = bestStream.acodec && bestStream.acodec !== 'none';
                        const totalEstimatedSize = videoSize
                            ? isStreamCombined
                                ? videoSize
                                : videoSize + (hasAudio ? audioStreamSize : 0)
                            : duration
                                ? Math.round(
                                    (duration *
                                        (height >= 1080 ? 4500 : height >= 720 ? 2500 : height >= 480 ? 1200 : height >= 360 ? 600 : 300) *
                                        1024) /
                                    8
                                )
                                : undefined;

                        formats.push({
                            id: `yt-video-${height}`,
                            label,
                            format: 'mp4',
                            quality: qualityStr,
                            resolution: resolutionStr,
                            fileSize: totalEstimatedSize,
                            fileSizeFormatted: totalEstimatedSize ? `${(totalEstimatedSize / 1024 / 1024).toFixed(1)} MB` : undefined,
                            downloadUrl: `/api/download?type=yt_stream&videoId=${videoId}&quality=${height}&size=${totalEstimatedSize || ''}&filename=${encodeURIComponent(`${cleanTitle}_${height}p.mp4`)}`,
                            hasAudio,
                            category: 'video',
                        });
                    }

                    // Add standalone master MP3 audio extraction option
                    formats.push({
                        id: 'yt-audio-mp3',
                        label: 'Extracted Master Audio (MP3)',
                        format: 'mp3',
                        quality: 'High Bitrate Audio',
                        fileSize: audioStreamSize,
                        fileSizeFormatted: `${(audioStreamSize / 1024 / 1024).toFixed(1)} MB`,
                        downloadUrl: `/api/download?type=yt_stream&videoId=${videoId}&quality=audio&size=${audioStreamSize}&filename=${encodeURIComponent(`${cleanTitle}_audio.mp3`)}`,
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
