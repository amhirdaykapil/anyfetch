import { GalleryItem, MediaFormatOption, MediaResult, MediaType } from '@/types/media';
import { ExtractionError, PlatformAdapter } from './base';
import { sanitizeFilename } from '@/lib/security';
import { decodeHtmlEntities } from '@/lib/html-entities';

export class TwitterAdapter implements PlatformAdapter {
    public id = 'twitter' as const;
    public name = 'X (Twitter)';
    public iconName = 'Twitter';

    public canHandle(url: string, parsedUrl?: URL): boolean {
        try {
            const u = parsedUrl || new URL(url);
            const host = u.hostname.toLowerCase();
            return host === 'x.com' || host === 'twitter.com' || host.endsWith('.twitter.com') || host.endsWith('.x.com');
        } catch {
            return false;
        }
    }

    public async extract(url: string): Promise<MediaResult> {
        const match = url.match(/status\/(\d+)/i);
        if (!match || !match[1]) {
            throw new ExtractionError('INVALID_URL', 'Invalid X (Twitter) URL. Must be a link to a specific post/status.', {
                officialUrl: url,
            });
        }

        const tweetId = match[1];

        // Query Twitter's official syndication embed API
        const syndicationUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=4`;
        let response: Response;

        try {
            response = await fetch(syndicationUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(8000),
            });
        } catch (err) {
            throw new ExtractionError('FETCH_FAILED', 'Failed to reach X syndication service.', {
                details: (err as Error).message,
                officialUrl: url,
            });
        }

        if (!response.ok) {
            if (response.status === 404) {
                throw new ExtractionError('DELETED_POST', 'This post was deleted or is not publicly accessible.', {
                    officialUrl: url,
                });
            }
            throw new ExtractionError('API_UNAVAILABLE', `X syndication returned status ${response.status}`, {
                officialUrl: url,
            });
        }

        const tweet = await response.json();
        const authorName = decodeHtmlEntities(tweet.user?.name || 'X User');
        const authorHandle = tweet.user?.screen_name ? `@${tweet.user.screen_name}` : undefined;
        const authorAvatar = tweet.user?.profile_image_url_https;
        const text = decodeHtmlEntities(tweet.text || 'X Media');
        const cleanTitle = sanitizeFilename(`${authorHandle || 'X'}_${text}`.substring(0, 60), 'X_Media');

        const mediaList = tweet.mediaDetails || [];
        const photos = tweet.photos || [];

        const formats: MediaFormatOption[] = [];
        const gallery: GalleryItem[] = [];
        let mediaType: MediaType = 'image';
        let thumbnailUrl = '';

        // Check for video in mediaDetails
        const videoItem = mediaList.find((m: any) => m.type === 'video' || m.type === 'animated_gif');
        if (videoItem && videoItem.video_info?.variants) {
            mediaType = 'video';
            thumbnailUrl = videoItem.media_url_https || '';

            const mp4Variants = videoItem.video_info.variants
                .filter((v: any) => v.content_type === 'video/mp4')
                .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

            if (mp4Variants.length === 0 && videoItem.video_info.variants[0]) {
                mp4Variants.push(videoItem.video_info.variants[0]);
            }

            for (let i = 0; i < mp4Variants.length; i++) {
                const variant = mp4Variants[i];
                let qualityLabel = 'Standard MP4';
                if (variant.bitrate) {
                    if (variant.bitrate > 1500000) qualityLabel = '1080p Full HD';
                    else if (variant.bitrate > 800000) qualityLabel = '720p HD';
                    else if (variant.bitrate > 400000) qualityLabel = '480p';
                    else qualityLabel = '360p';
                }

                formats.push({
                    id: `x-video-${i}`,
                    label: `${qualityLabel} (MP4)`,
                    format: 'mp4',
                    quality: qualityLabel,
                    downloadUrl: `/api/download?url=${encodeURIComponent(variant.url)}&filename=${encodeURIComponent(`${cleanTitle}_${qualityLabel.replace(/\s+/g, '_')}.mp4`)}`,
                    hasAudio: videoItem.type !== 'animated_gif',
                    category: 'video',
                });
            }

            return {
                id: `twitter-${tweetId}`,
                originalUrl: url,
                canonicalUrl: `https://x.com/${tweet.user?.screen_name || 'i'}/status/${tweetId}`,
                platform: 'twitter',
                platformName: 'X (Twitter)',
                title: text.substring(0, 100),
                author: {
                    name: authorName,
                    username: authorHandle,
                    avatarUrl: authorAvatar,
                    profileUrl: authorHandle ? `https://x.com/${tweet.user.screen_name}` : undefined,
                },
                mediaType: 'video',
                thumbnailUrl,
                formats,
                officialViewUrl: url,
                fetchedAt: new Date().toISOString(),
            };
        }

        // Check for multiple photos / gallery
        if (photos.length > 0 || mediaList.length > 0) {
            const items = photos.length > 0 ? photos : mediaList;
            mediaType = items.length > 1 ? 'gallery' : 'image';

            for (let i = 0; i < items.length; i++) {
                const photo = items[i];
                const rawUrl = photo.url || photo.media_url_https;
                if (!rawUrl) continue;
                const origUrl = rawUrl.includes('?') ? `${rawUrl}&name=orig` : `${rawUrl}?name=orig`;

                const slideNum = String(i + 1).padStart(2, '0');
                const dlUrl = `/api/download?url=${encodeURIComponent(origUrl)}&filename=${encodeURIComponent(`AnyFetch_Slide_${slideNum}.jpg`)}`;
                const resolution = photo.width && photo.height ? `${photo.width} × ${photo.height}` : undefined;

                gallery.push({
                    id: `photo-${i + 1}`,
                    position: i + 1,
                    type: 'image',
                    url: origUrl,
                    downloadUrl: dlUrl,
                    thumbnailUrl: rawUrl,
                    width: photo.width,
                    height: photo.height,
                    resolution,
                    format: 'jpg',
                });

                if (i === 0) {
                    thumbnailUrl = rawUrl;
                    formats.push({
                        id: 'x-photo-primary',
                        label: items.length > 1 ? `Primary Photo (1 of ${items.length})` : 'Original Photo (High-Res)',
                        format: 'jpg',
                        quality: resolution || 'Original Maximum Quality',
                        resolution,
                        downloadUrl: dlUrl,
                        category: 'image',
                    });
                }
            }

            return {
                id: `twitter-${tweetId}`,
                originalUrl: url,
                canonicalUrl: `https://x.com/${tweet.user?.screen_name || 'i'}/status/${tweetId}`,
                platform: 'twitter',
                platformName: 'X (Twitter)',
                title: text.substring(0, 100),
                author: {
                    name: authorName,
                    username: authorHandle,
                    avatarUrl: authorAvatar,
                    profileUrl: authorHandle ? `https://x.com/${tweet.user.screen_name}` : undefined,
                },
                mediaType,
                thumbnailUrl,
                formats,
                gallery: gallery.length > 1 ? gallery : undefined,
                officialViewUrl: url,
                fetchedAt: new Date().toISOString(),
            };
        }

        throw new ExtractionError(
            'NO_MEDIA_FOUND',
            'This post on X contains text only and does not contain videos or images.',
            { officialUrl: url }
        );
    }
}

