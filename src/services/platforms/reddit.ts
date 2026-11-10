import { GalleryItem, MediaFormatOption, MediaResult, MediaType } from '@/types/media';
import { ExtractionError, PlatformAdapter } from './base';
import { formatBytes, formatDuration } from '@/lib/utils';
import { sanitizeFilename } from '@/lib/security';
import { decodeHtmlEntities } from '@/lib/html-entities';

interface RedditTokenCache {
    accessToken: string;
    expiresAt: number; // Unix timestamp in ms
}

let cachedRedditToken: RedditTokenCache | null = null;

/**
 * Retrieves a valid Reddit OAuth2 App Access Token via client_credentials
 */
async function getRedditOAuthToken(): Promise<string | null> {
    const clientId = process.env.REDDIT_CLIENT_ID?.trim();
    const clientSecret = process.env.REDDIT_CLIENT_SECRET?.trim();
    const userAgent = process.env.REDDIT_USER_AGENT?.trim() || 'web:omnifetch:v2.5 (by /u/omnifetch_bot)';

    if (!clientId || !clientSecret) {
        return null;
    }

    // Return cached token if valid with 60-second buffer
    const now = Date.now();
    if (cachedRedditToken && cachedRedditToken.expiresAt > now + 60000) {
        return cachedRedditToken.accessToken;
    }

    try {
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const res = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': userAgent,
            },
            body: 'grant_type=client_credentials',
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`OAuth token endpoint HTTP ${res.status}: ${errText}`);
        }

        const data = await res.json();
        if (!data.access_token) {
            throw new Error('No access_token field in Reddit token response');
        }

        const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 3600;
        cachedRedditToken = {
            accessToken: data.access_token,
            expiresAt: now + expiresInSec * 1000,
        };

        return cachedRedditToken.accessToken;
    } catch (err) {
        throw new ExtractionError(
            'RESTRICTED_CONTENT',
            `Reddit OAuth authentication failed: ${(err as Error).message}. Verify REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.`,
            { details: (err as Error).message }
        );
    }
}

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
                host === 'i.redd.it' ||
                host === 'preview.redd.it' ||
                host === 'redditstatic.com' ||
                host.endsWith('.redditstatic.com')
            );
        } catch {
            return false;
        }
    }

  public async extract(url: string): Promise<MediaResult> {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();

        // 1. Direct i.redd.it, preview.redd.it, or redditstatic media asset (No API credentials required)
        if (host === 'i.redd.it' || host === 'preview.redd.it' || host.endsWith('redditstatic.com')) {
            const filename = parsed.pathname.split('/').pop() || 'reddit_image.png';
            const cleanTitle = sanitizeFilename(filename.replace(/\.[^/.]+$/, ''), 'Reddit_Image');
            const ext = (filename.match(/\.([a-zA-Z0-9]+)$/) || [])[1]?.toLowerCase() || 'png';
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
                        label: `Original High-Res ${ext.toUpperCase()}`,
                        format: ext,
                        quality: 'Original Resolution',
                        downloadUrl: `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(cleanTitle + '.' + ext)}`,
                        isDirect: true,
                        category: 'image',
                    },
                ],
                officialViewUrl: url,
                fetchedAt: new Date().toISOString(),
            };
        }

        // 2. Direct v.redd.it video (No API credentials required)
        if (host === 'v.redd.it') {
            const videoId = parsed.pathname.split('/').filter(Boolean)[0] || 'video';
            const videoUrl = `https://v.redd.it/${videoId}/DASH_720.mp4`;
            return {
                id: `reddit-v-${videoId}`,
                originalUrl: url,
                platform: 'reddit',
                platformName: 'Reddit Video',
                title: `Reddit Video ${videoId}`,
                mediaType: 'video',
                thumbnailUrl: `https://v.redd.it/${videoId}/DASH_360.mp4`,
                formats: [
                    {
                        id: 'reddit-v-720',
                        label: 'HD Video 720p (MP4)',
                        format: 'mp4',
                        quality: '720p HD',
                        downloadUrl: `/api/download?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(`Reddit_${videoId}.mp4`)}`,
                        hasAudio: true,
                        category: 'video',
                    },
                ],
                officialViewUrl: url,
                fetchedAt: new Date().toISOString(),
            };
        }

        // 3. Normalized Post URL handling with OAuth or public fallback
        const hasCredentials = Boolean(process.env.REDDIT_CLIENT_ID?.trim() && process.env.REDDIT_CLIENT_SECRET?.trim());
        let token: string | null = null;

        if (hasCredentials) {
            token = await getRedditOAuthToken();
        }

        let requestUrl: string;
        const requestHeaders: Record<string, string> = {
            'Accept': 'application/json',
            'User-Agent':
                process.env.REDDIT_USER_AGENT?.trim() ||
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 OmniFetch/2.5',
        };

        if (token) {
            // Use authenticated OAuth endpoint
            const postPath = parsed.pathname.replace(/\/$/, '');
            requestUrl = `https://oauth.reddit.com${postPath}.json?raw_json=1`;
            requestHeaders['Authorization'] = `Bearer ${token}`;
        } else {
            // Use public .json endpoint
            let jsonUrl = url.split('?')[0];
            if (!jsonUrl.endsWith('.json')) {
                jsonUrl = jsonUrl.replace(/\/$/, '') + '.json';
            }
            requestUrl = `${jsonUrl}?raw_json=1`;
        }

            let jsonRes: Response;
            try {
                jsonRes = await fetch(requestUrl, {
                    headers: requestHeaders,
                    signal: AbortSignal.timeout(8000),
                });
            } catch (err) {
                throw new ExtractionError(
                    'FETCH_FAILED',
                    'Could not communicate with Reddit service.',
                    { details: (err as Error).message }
                );
            }

            if (!jsonRes.ok) {
                if (jsonRes.status === 404) {
                    throw new ExtractionError('DELETED_POST', 'The specified Reddit post was deleted or does not exist.', { officialUrl: url });
                }
                if (jsonRes.status === 403 || jsonRes.status === 429) {
                    if (!hasCredentials) {
                        throw new ExtractionError(
                            'RESTRICTED_CONTENT',
                            'Reddit API credentials not configured. Direct image/video links (i.redd.it, v.redd.it) are supported without credentials. To enable full post extraction, configure REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.',
                            { officialUrl: url }
                        );
                    } else {
                        throw new ExtractionError(
                            'RESTRICTED_CONTENT',
                            `Reddit API returned HTTP ${jsonRes.status} (Access restricted or rate limited). Verify Reddit app permissions and rate limits.`,
                            { officialUrl: url }
                        );
                    }
                }
                throw new ExtractionError('API_UNAVAILABLE', `Reddit API returned HTTP ${jsonRes.status}`, { officialUrl: url });
            }

            let data: any;
            try {
                data = await jsonRes.json();
            } catch {
                throw new ExtractionError(
                    'RESTRICTED_CONTENT',
                    'Reddit requires an active account or registered API credentials to access this post.',
                    { officialUrl: url }
                );
            }

            if (!Array.isArray(data) || !data[0]?.data?.children?.[0]?.data) {
                throw new ExtractionError('NO_MEDIA_FOUND', 'Unable to parse Reddit post structure.', { officialUrl: url });
            }

                const post = data[0].data.children[0].data;
                const title = decodeHtmlEntities(post.title || 'Reddit Post');
                const author = post.author ? `u/${post.author}` : undefined;
                const subreddit = post.subreddit_name_prefixed || 'r/reddit';
                const cleanTitle = sanitizeFilename(`${subreddit}_${title}`.substring(0, 60), 'Reddit_Media');

                let mediaType: MediaType = 'image';
                let thumbnailUrl = post.thumbnail && post.thumbnail.startsWith('http') ? post.thumbnail : '';
                const formats: MediaFormatOption[] = [];
                const thumbnails: MediaFormatOption[] = [];
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

                    // Add video resolution
                    formats.push({
                        id: 'reddit-video-hd',
                        label: `Video (${height}p MP4)`,
                        format: 'mp4',
                        quality: `${height}p HD`,
                        downloadUrl: `/api/download?url=${encodeURIComponent(fallbackUrl)}&filename=${encodeURIComponent(cleanTitle + '.mp4')}`,
                        hasAudio: false,
                        category: 'video',
                    });

                // Audio track if available
                const audioUrl = fallbackUrl.replace(/DASH_\d+\.mp4.*/, 'DASH_AUDIO_128.mp4');
                formats.push({
                    id: 'reddit-audio',
                    label: 'Audio Track (M4A / MP3)',
                    format: 'm4a',
                    quality: '128 kbps',
                    downloadUrl: `/api/download?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(cleanTitle + '_audio.m4a')}`,
                    category: 'audio',
                });

                    if (thumbnailUrl) {
                        thumbnails.push({
                            id: 'reddit-video-thumb',
                            label: 'Video Thumbnail (JPG)',
                            format: 'jpg',
                            quality: 'Preview Poster',
                            downloadUrl: `/api/download?url=${encodeURIComponent(thumbnailUrl)}&filename=${encodeURIComponent(cleanTitle + '_thumb.jpg')}`,
                            category: 'thumbnail',
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
                        mediaType: 'video',
                        thumbnailUrl,
                        duration,
                        durationFormatted: formatDuration(duration),
                        viewCount: post.ups,
                        formats,
                        thumbnails: thumbnails.length > 0 ? thumbnails : undefined,
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
                            formats.push({
                                id: 'reddit-gallery-first',
                                label: `Primary Image (${gallery.length} in Gallery)`,
                                format: 'jpg',
                                quality: 'Original Resolution',
                                downloadUrl: gallery[0].url,
                                category: 'image',
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
                            category: 'image',
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

                // If external link preview exists
                if (post.preview?.images?.[0]?.source?.url) {
                    const sourceUrl = post.preview.images[0].source.url.replace(/&amp;/g, '&');
                    thumbnailUrl = sourceUrl;
                    formats.push({
                        id: 'reddit-preview-image',
                        label: 'Source Image (Preview JPG)',
                        format: 'jpg',
                        quality: 'Max Resolution',
                        downloadUrl: `/api/download?url=${encodeURIComponent(sourceUrl)}&filename=${encodeURIComponent(cleanTitle + '.jpg')}`,
                        category: 'image',
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
