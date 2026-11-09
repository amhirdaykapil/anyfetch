import { MediaFormatOption, MediaResult, MediaType } from '@/types/media';
import { ExtractionError, PlatformAdapter } from './base';
import { sanitizeFilename } from '@/lib/security';

export class TikTokAdapter implements PlatformAdapter {
    public id = 'tiktok' as const;
    public name = 'TikTok';
    public iconName = 'Video';

    public canHandle(url: string, parsedUrl?: URL): boolean {
        try {
            const u = parsedUrl || new URL(url);
            const host = u.hostname.toLowerCase();
            return (
                host === 'tiktok.com' ||
                host.endsWith('.tiktok.com') ||
                host === 'vm.tiktok.com' ||
                host === 'vt.tiktok.com'
            );
        } catch {
            return false;
        }
    }

    public async extract(url: string): Promise<MediaResult> {
        let targetUrl = url;

        // Follow redirect for short URLs
        if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com') || url.includes('/t/')) {
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

        // Query TikTok Official oEmbed API
        let oembedData: any = null;
        try {
            const oembedRes = await fetch(
                `https://www.tiktok.com/oembed?url=${encodeURIComponent(targetUrl)}`,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OmniMedia/1.0',
                    },
                    signal: AbortSignal.timeout(7000),
                }
            );

            if (oembedRes.ok) {
                oembedData = await oembedRes.json();
            } else if (oembedRes.status === 404) {
                throw new ExtractionError('DELETED_POST', 'This TikTok video was deleted or set to private.', {
                    officialUrl: targetUrl,
                });
            }
        } catch (err) {
            if (err instanceof ExtractionError) throw err;
        }

        // Try scraping HTML for og:video and direct stream
        let ogVideo = '';
        let ogImage = oembedData?.thumbnail_url || '';
        let title = oembedData?.title || 'TikTok Video';
        let authorName = oembedData?.author_name || 'TikTok Creator';

        try {
            const htmlRes = await fetch(targetUrl, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
                },
                signal: AbortSignal.timeout(6000),
            });

            if (htmlRes.ok) {
                const html = await htmlRes.text();
                const vidMatch = html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+)["']/i) ||
                    html.match(/content=["']([^"']+)["']\s+property=["']og:video["']/i) ||
                    html.match(/"playAddr":\s*"([^"]+)"/i);
                if (vidMatch && vidMatch[1]) {
                    ogVideo = vidMatch[1].replace(/\\u0026/g, '&');
                }

                if (!ogImage) {
                    const imgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
                    if (imgMatch && imgMatch[1]) ogImage = imgMatch[1];
                }
            }
        } catch {
            // Continue with oembed data
        }

        if (!oembedData && !ogImage && !ogVideo) {
            throw new ExtractionError(
                'FETCH_FAILED',
                'Could not access metadata for this TikTok video. The post may be restricted.',
                { officialUrl: targetUrl }
            );
        }

        const cleanTitle = sanitizeFilename(title.substring(0, 50), 'TikTok_Video');
        const formats: MediaFormatOption[] = [];

        if (ogVideo) {
            formats.push({
                id: 'tt-video-hd',
                label: 'TikTok Video (HD MP4)',
                format: 'mp4',
                quality: 'Original HD Quality',
                downloadUrl: `/api/download?url=${encodeURIComponent(ogVideo)}&filename=${encodeURIComponent(`${cleanTitle}.mp4`)}`,
                hasAudio: true,
            });
        }

        if (ogImage) {
            formats.push({
                id: 'tt-cover-img',
                label: 'Original Video Cover (JPG)',
                format: 'jpg',
                quality: 'High Resolution',
                downloadUrl: `/api/download?url=${encodeURIComponent(ogImage)}&filename=${encodeURIComponent(`${cleanTitle}_cover.jpg`)}`,
            });
        }

        return {
            id: `tiktok-${Buffer.from(targetUrl).toString('base64url').substring(0, 16)}`,
            originalUrl: url,
            canonicalUrl: targetUrl,
            platform: 'tiktok',
            platformName: 'TikTok',
            title,
            author: {
                name: authorName,
                username: oembedData?.author_unique_id ? `@${oembedData.author_unique_id}` : undefined,
                profileUrl: oembedData?.author_url,
            },
            mediaType: 'video',
            thumbnailUrl: ogImage,
            formats,
            complianceNotice:
                'Downloads of public TikTok videos are subject to platform terms and creator rights.',
            officialViewUrl: targetUrl,
            fetchedAt: new Date().toISOString(),
        };
    }
}
