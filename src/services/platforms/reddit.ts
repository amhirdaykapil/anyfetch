import { GalleryItem, MediaFormatOption, MediaResult, MediaType } from '@/types/media';
import { ExtractionError, PlatformAdapter } from './base';
import { formatBytes, formatDuration } from '@/lib/utils';
import { sanitizeFilename } from '@/lib/security';
import { decodeHtmlEntities } from '@/lib/html-entities';

interface RedditTokenCache {
    accessToken: string;
    expiresAt: number;
}

let cachedRedditToken: RedditTokenCache | null = null;

async function getRedditOAuthToken(): Promise<string | null> {
    const clientId = process.env.REDDIT_CLIENT_ID?.trim();
    const clientSecret = process.env.REDDIT_CLIENT_SECRET?.trim();
    const userAgent = process.env.REDDIT_USER_AGENT?.trim() || 'web:omnifetch:v2.5 (by /u/omnifetch_bot)';

    if (!clientId || !clientSecret) {
        return null;
    }

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

        if (res.status === 401 || res.status === 403) {
            throw new ExtractionError(
                'INVALID_CREDENTIALS',
                'The configured REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET is invalid or revoked by Reddit.',
                { details: `Status ${res.status}` }
            );
        }

        if (!res.ok) {
            throw new Error(`OAuth token endpoint HTTP ${res.status}`);
        }

        const data = await res.json();
        if (!data.access_token) {
            throw new Error('Missing access_token field in Reddit response');
        }

        const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 3600;
        cachedRedditToken = {
            accessToken: data.access_token,
            expiresAt: now + expiresInSec * 1000,
        };

        return cachedRedditToken.accessToken;
    } catch (err) {
        if (err instanceof ExtractionError) throw err;
        throw new ExtractionError(
            'INVALID_CREDENTIALS',
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
        let targetUrl = url;
        let parsed = new URL(url);
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

        // 3. Resolve shortlinks (redd.it/xyz) or share links (/r/.../s/xyz)
        if (host === 'redd.it' || parsed.pathname.includes('/s/')) {
            try {
                const head = await fetch(url, {
                    method: 'HEAD',
                    redirect: 'follow',
                    headers: { 'User-Agent': 'facebookexternalhit/1.1' },
                    signal: AbortSignal.timeout(6000),
                });
                if (head.url && head.url !== url) {
                    targetUrl = head.url;
                    parsed = new URL(targetUrl);
                }
            } catch {
                // Continue with original URL
            }
        }

        const hasCredentials = Boolean(process.env.REDDIT_CLIENT_ID?.trim() && process.env.REDDIT_CLIENT_SECRET?.trim());
        let token: string | null = null;

        if (hasCredentials) {
            token = await getRedditOAuthToken();
        }

        // If OAuth token is available, query oauth.reddit.com
        if (token) {
            const postPath = parsed.pathname.replace(/\/$/, '');
            const requestUrl = `https://oauth.reddit.com${postPath}.json?raw_json=1`;
            const jsonRes = await fetch(requestUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'User-Agent': process.env.REDDIT_USER_AGENT?.trim() || 'web:omnifetch:v2.5 (by /u/omnifetch_bot)',
                },
                signal: AbortSignal.timeout(8000),
            });

            if (jsonRes.ok) {
                const data = await jsonRes.json();
                return this.parseRedditPostJson(data, targetUrl);
            } else if (jsonRes.status === 404) {
                throw new ExtractionError('DELETED_POST', 'This Reddit post was deleted or does not exist.', { officialUrl: targetUrl });
            } else if (jsonRes.status === 403) {
                throw new ExtractionError('PRIVATE_CONTENT', 'This Reddit post belongs to a private subreddit or community.', { officialUrl: targetUrl });
            } else if (jsonRes.status === 429) {
                throw new ExtractionError('RATE_LIMITED', 'Reddit OAuth API rate limit reached. Please try again in a few moments.', { officialUrl: targetUrl });
            }
        }

        // 4. Fallback: Public web crawler resolution using social agent headers
        try {
            const htmlRes = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                signal: AbortSignal.timeout(8000),
            });

            if (htmlRes.status === 404) {
                throw new ExtractionError('DELETED_POST', 'This Reddit post was deleted or does not exist.', { officialUrl: targetUrl });
            }
            if (htmlRes.status === 429) {
                throw new ExtractionError('RATE_LIMITED', 'Reddit rate limit reached. To enable continuous extraction, configure REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in environment variables.', { officialUrl: targetUrl });
            }

            if (htmlRes.ok) {
                const html = await htmlRes.text();

                // Extract og:title
                let title = 'Reddit Post';
                const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
                if (titleMatch && titleMatch[1]) {
                    title = decodeHtmlEntities(titleMatch[1].replace(/^From the [^:]+ community on Reddit:\s*/i, '').trim());
                }

                // Extract og:image
                let ogImage = '';
                const imgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
                if (imgMatch && imgMatch[1]) {
                    ogImage = imgMatch[1].replace(/&amp;/g, '&');
                }

                // Check if og:image is a direct i.redd.it image
                if (ogImage && ogImage.includes('i.redd.it')) {
                    const cleanTitle = sanitizeFilename(title.substring(0, 50), 'Reddit_Image');
                    const ext = (ogImage.match(/\.([a-zA-Z0-9]+)$/) || [])[1]?.toLowerCase() || 'jpg';
                    return {
                        id: `reddit-${Buffer.from(targetUrl).toString('base64url').substring(0, 16)}`,
                        originalUrl: url,
                        canonicalUrl: targetUrl,
                        platform: 'reddit',
                        platformName: 'Reddit',
                        title,
                        mediaType: 'image',
                        thumbnailUrl: ogImage,
                        formats: [
                            {
                                id: 'reddit-orig-img',
                                label: `Original High-Res ${ext.toUpperCase()}`,
                                format: ext,
                                quality: 'Original Resolution',
                                downloadUrl: `/api/download?url=${encodeURIComponent(ogImage)}&filename=${encodeURIComponent(`${cleanTitle}.${ext}`)}`,
                                isDirect: true,
                                category: 'image',
                            },
                        ],
                        officialViewUrl: targetUrl,
                        fetchedAt: new Date().toISOString(),
                    };
                }
            }
        } catch (err) {
            if (err instanceof ExtractionError) throw err;
        }

        // If unauthenticated public extraction could not parse media, return specific AUTHENTICATION_REQUIRED error
        throw new ExtractionError(
            'AUTHENTICATION_REQUIRED',
            'Reddit requires developer credentials or an active account to access this post. Direct image and video links (i.redd.it, v.redd.it) are supported without credentials. To enable full post extraction, configure REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.',
            { officialUrl: targetUrl }
        );
    }

    private parseRedditPostJson(data: any, canonicalUrl: string): MediaResult {
        if (!Array.isArray(data) || !data[0]?.data?.children?.[0]?.data) {
            throw new ExtractionError('NO_MEDIA_FOUND', 'Unable to parse Reddit post structure.', { officialUrl: canonicalUrl });
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

            formats.push({
                id: 'reddit-video-hd',
                label: `Video (${height}p MP4)`,
                format: 'mp4',
                quality: `${height}p HD`,
                downloadUrl: `/api/download?url=${encodeURIComponent(fallbackUrl)}&filename=${encodeURIComponent(cleanTitle + '.mp4')}`,
                hasAudio: false,
                category: 'video',
            });

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
                originalUrl: canonicalUrl,
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
                for (let idx = 0; idx < post.gallery_data.items.length; idx++) {
                    const item = post.gallery_data.items[idx];
                    const meta = post.media_metadata[item.media_id];
                    if (meta && meta.s) {
                        const rawUrl = meta.s.u ? meta.s.u.replace(/&amp;/g, '&') : meta.s.gif?.replace(/&amp;/g, '&');
                        if (rawUrl) {
                            const ext = meta.e === 'AnimatedImage' ? 'gif' : (meta.m?.split('/')[1] || 'jpg');
                            const slideNum = String(idx + 1).padStart(2, '0');
                            const dlFilename = `OmniFetch_Slide_${slideNum}.${ext}`;
                            const width = meta.s.x;
                            const height = meta.s.y;
                            const resolution = width && height ? `${width} × ${height}` : undefined;
                            const isVid = meta.e === 'AnimatedImage';

                            gallery.push({
                                id: item.media_id,
                                position: idx + 1,
                                type: isVid ? 'video' : 'image',
                                url: rawUrl,
                                downloadUrl: `/api/download?url=${encodeURIComponent(rawUrl)}&filename=${encodeURIComponent(dlFilename)}`,
                                thumbnailUrl: rawUrl,
                                width,
                                height,
                                resolution,
                                format: ext,
                            });

                            formats.push({
                                id: `reddit-slide-${idx + 1}`,
                                label: `Slide ${slideNum} (${ext.toUpperCase()} ${isVid ? 'Animation' : 'Photo'})`,
                                format: ext,
                                quality: resolution || 'Original Resolution',
                                resolution,
                                downloadUrl: `/api/download?url=${encodeURIComponent(rawUrl)}&filename=${encodeURIComponent(dlFilename)}`,
                                category: isVid ? 'video' : 'image',
                            });
                        }
                    }
                }

                if (gallery.length > 0) {
                    thumbnailUrl = gallery[0].thumbnailUrl || '';
                }

                return {
                    id: `reddit-${post.id}`,
                    originalUrl: canonicalUrl,
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
                    originalUrl: canonicalUrl,
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
                    originalUrl: canonicalUrl,
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
