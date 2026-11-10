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
            const cleanTitle = `Reddit_Video_${videoId}`;
            const formats = await this.resolveRedditVideoFormats(videoId, '', cleanTitle);
            return {
                id: `reddit-v-${videoId}`,
                originalUrl: url,
                platform: 'reddit',
                platformName: 'Reddit Video',
                title: `Reddit Video ${videoId}`,
                mediaType: 'video',
                thumbnailUrl: `https://v.redd.it/${videoId}/DASH_360.mp4`,
                formats,
                officialViewUrl: url,
                fetchedAt: new Date().toISOString(),
            };
        }

        // 3. Resolve shortlinks (redd.it/xyz) or share links (/r/.../s/xyz)
        if (host === 'redd.it' || parsed.pathname.includes('/s/')) {
            try {
                const head = await fetch(url, {
                    method: 'GET',
                    redirect: 'manual',
                    headers: { 'User-Agent': 'facebookexternalhit/1.1' },
                    signal: AbortSignal.timeout(6000),
                });
                    const loc = head.headers.get('location');
                    if (loc) {
                        targetUrl = new URL(loc, url).toString();
                        parsed = new URL(targetUrl);
                    } else {
                        const follow = await fetch(url, {
                            method: 'HEAD',
                            redirect: 'follow',
                            headers: { 'User-Agent': 'facebookexternalhit/1.1' },
                            signal: AbortSignal.timeout(6000),
                        });
                        if (follow.url && follow.url !== url) {
                            targetUrl = follow.url;
                            parsed = new URL(targetUrl);
                        }
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
                try {
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
                    } catch (err) {
                        if (err instanceof ExtractionError) throw err;
                        // Otherwise fall through to robust public web extraction
                    }
                }

                        // 4. Public Web Resolution without credentials
                        return await this.extractPublicRedditPost(url, targetUrl, parsed);
                    }

    private async extractPublicRedditPost(originalUrl: string, targetUrl: string, parsed: URL): Promise < MediaResult > {
                        const subMatch = parsed.pathname.match(/\/r\/([a-zA-Z0-9_]+)/i);
                        const subreddit = subMatch ? subMatch[1] : 'reddit';
                        const postMatch = parsed.pathname.match(/\/comments\/([a-zA-Z0-9]+)/i);
                        const postId = postMatch ? postMatch[1] : '';
                        const canonicalUrl = postId
                            ? `https://www.reddit.com/r/${subreddit}/comments/${postId}/`
                            : targetUrl.split('?')[0];

                        let oembedTitle = '';
                        let oembedAuthor = '';

                        const [oembedRes, embedRes, socialRes] = await Promise.allSettled([
                            fetch(`https://www.reddit.com/oembed?url=${encodeURIComponent(canonicalUrl)}`, {
                                signal: AbortSignal.timeout(6000),
                            }),
                            postId ? fetch(`https://embed.reddit.com/r/${subreddit}/comments/${postId}/`, {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                                    'Accept': 'text/html,application/xhtml+xml',
                                },
                                signal: AbortSignal.timeout(7000),
                            }) : Promise.resolve(null as any),
                            fetch(targetUrl, {
                                headers: {
                                    'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
                                    'Accept': 'text/html,application/xhtml+xml',
                                },
                        signal: AbortSignal.timeout(7000),
                    }),
        ]);

                        if (oembedRes.status === 'fulfilled' && oembedRes.value && oembedRes.value.ok) {
                            try {
                                const oData = await oembedRes.value.json();
                                if (oData.title) oembedTitle = decodeHtmlEntities(oData.title);
                                if (oData.author_name) oembedAuthor = `u/${oData.author_name}`;
                            } catch {
                                // Ignore oembed parse failure
                            }
                            }

                            let embedHtml = '';
                            let screenPost: { id?: string; url?: string; type?: string; created_timestamp?: number } | null = null;

                            if (embedRes.status === 'fulfilled' && embedRes.value && embedRes.value.ok) {
                                try {
                                    embedHtml = await embedRes.value.text();
                                    const screenMatch = embedHtml.match(/<shreddit-screenview-data\s+data="([^"]+)"/);
                                    if (screenMatch) {
                                        const unescaped = screenMatch[1]
                                            .replace(/&quot;/g, '"')
                                            .replace(/&amp;/g, '&')
                                            .replace(/&lt;/g, '<')
                                            .replace(/&gt;/g, '>');
                                        const parsedData = JSON.parse(unescaped);
                                        screenPost = parsedData.post || null;
                                    }
                                } catch {
                                    // Ignore embed parse failure
                                }
                            }

                                let socialHtml = '';
                                let ogTitle = '';
                                let ogImage = '';
                                let ogVideo = '';

                                if (socialRes.status === 'fulfilled' && socialRes.value && socialRes.value.ok) {
                                    try {
                                        socialHtml = await socialRes.value.text();
                                        const titleMatch = socialHtml.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
                                        if (titleMatch && titleMatch[1]) {
                                            ogTitle = decodeHtmlEntities(titleMatch[1].replace(/^From the [^:]+ community on Reddit:\s*/i, '').trim());
                                        }
                                        const imgMatch = socialHtml.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
                                        if (imgMatch && imgMatch[1]) {
                                            ogImage = imgMatch[1].replace(/&amp;/g, '&');
                                        }
                                            const vidMatch = socialHtml.match(/<meta\s+property=["']og:video(?::url)?["']\s+content=["']([^"']+)["']/i);
                                            if (vidMatch && vidMatch[1]) {
                                                ogVideo = vidMatch[1].replace(/&amp;/g, '&');
                                            }
                                        } catch {
                                            // Ignore social parse failure
                                        }
                                    }

                                    // Title resolution
                                    let embedHeading = '';
                                    const h1Match = embedHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
                                    if (h1Match && h1Match[1]) {
                                        embedHeading = decodeHtmlEntities(h1Match[1].replace(/<[^>]+>/g, '').trim());
                                    }

                                    const title = oembedTitle || embedHeading || ogTitle || 'Reddit Post';
                                    const cleanTitle = sanitizeFilename(`r_${subreddit}_${title}`.substring(0, 60), 'Reddit_Media');

                                    // Check if embed preview images or srcset exist
                                    let embedPreviewImg = '';
                                    const imgMatch = embedHtml.match(/<img[^>]+class="[^"]*object-contain[^"]*"[^>]+src="([^"]+)"/i)
                                        || embedHtml.match(/<img[^>]+src="([^"]+)"[^>]+class="[^"]*object-contain[^"]*"/i);
                                    if (imgMatch && imgMatch[1]) {
                                        embedPreviewImg = imgMatch[1].replace(/&amp;/g, '&');
                                    }

                                    // Primary media resolution
                                    const postUrl = screenPost?.url;
                                    const postType = screenPost?.type;

        // CASE 1: Video Post (via shreddit-screenview-data or og:video or v.redd.it)
        if (postType === 'video' || (postUrl && postUrl.includes('v.redd.it')) || ogVideo || embedHtml.includes('v.redd.it')) {
            let videoId = '';
            if (postUrl && postUrl.includes('v.redd.it')) {
                videoId = postUrl.split('/').filter(Boolean).pop() || '';
            }
            if (!videoId && ogVideo) {
                const vm = ogVideo.match(/v\.redd\.it\/([a-zA-Z0-9]+)/);
                if (vm) videoId = vm[1];
            }
            if (!videoId) {
                const vm = embedHtml.match(/https?:\/\/v\.redd\.it\/([a-zA-Z0-9]+)/);
                if (vm) videoId = vm[1];
            }

            if (videoId) {
                let playerPoster = '';
                const posterMatch = embedHtml.match(/poster="([^"]+)"/i);
                if (posterMatch && posterMatch[1]) {
                    playerPoster = decodeHtmlEntities(posterMatch[1]);
                }

                const thumb = playerPoster || ogImage || embedPreviewImg || `https://v.redd.it/${videoId}/DASH_360.mp4`;
                const formats = await this.resolveRedditVideoFormats(videoId, embedHtml, cleanTitle);

                const thumbnails: MediaFormatOption[] = thumb ? [
                    {
                        id: 'reddit-v-thumb',
                        label: 'Video Poster Artwork (JPG)',
                        format: 'jpg',
                        quality: 'Preview Poster',
                        downloadUrl: `/api/download?url=${encodeURIComponent(thumb)}&filename=${encodeURIComponent(`${cleanTitle}_poster.jpg`)}`,
                        category: 'thumbnail',
                    }
                ] : [];

                return {
                    id: `reddit-${postId || Buffer.from(targetUrl).toString('base64url').substring(0, 12)}`,
                    originalUrl,
                    canonicalUrl,
                    platform: 'reddit',
                    platformName: 'Reddit',
                    title,
                    author: {
                        name: oembedAuthor || `r/${subreddit}`,
                        username: oembedAuthor,
                        profileUrl: oembedAuthor ? `https://reddit.com/${oembedAuthor}` : `https://reddit.com/r/${subreddit}`,
                    },
                    mediaType: 'video',
                    thumbnailUrl: thumb,
                    formats,
                    thumbnails: thumbnails.length > 0 ? thumbnails : undefined,
                    officialViewUrl: canonicalUrl,
                    fetchedAt: new Date().toISOString(),
                };
            }
        }

                                    // CASE 2: Image Post (via postUrl or ogImage or embedPreviewImg)
                                    let resolvedImageUrl = '';
                                    if (postUrl && (postUrl.includes('i.redd.it') || /\.(jpg|jpeg|png|webp|gif)$/i.test(postUrl))) {
                                        resolvedImageUrl = postUrl;
                                    } else if (ogImage && (ogImage.includes('i.redd.it') || ogImage.includes('share.redd.it') || ogImage.includes('preview.redd.it'))) {
                                        resolvedImageUrl = ogImage;
                                    } else if (embedPreviewImg) {
                                        resolvedImageUrl = embedPreviewImg;
                                    }

                                    if (resolvedImageUrl) {
                                        const extMatch = resolvedImageUrl.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
                                        const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
                                        const thumbUrl = ogImage || embedPreviewImg || resolvedImageUrl;

                                        const formats: MediaFormatOption[] = [
                                            {
                                                id: 'reddit-orig-img',
                                                label: `Original High-Res ${ext.toUpperCase()}`,
                                                format: ext,
                                                quality: 'Original Resolution',
                                                downloadUrl: `/api/download?url=${encodeURIComponent(resolvedImageUrl)}&filename=${encodeURIComponent(`${cleanTitle}.${ext}`)}`,
                                                isDirect: true,
                                                category: 'image',
                                            },
                                        ];

                                        const thumbnails: MediaFormatOption[] = [];
                                        if (thumbUrl && thumbUrl !== resolvedImageUrl) {
                                            thumbnails.push({
                                                id: 'reddit-thumb-img',
                                                label: 'Preview Poster Artwork (JPG)',
                                                format: 'jpg',
                                                quality: 'Preview Quality',
                                                downloadUrl: `/api/download?url=${encodeURIComponent(thumbUrl)}&filename=${encodeURIComponent(`${cleanTitle}_preview.jpg`)}`,
                                                category: 'thumbnail',
                                            });
                                        }

                                        return {
                                            id: `reddit-${postId || Buffer.from(targetUrl).toString('base64url').substring(0, 12)}`,
                                            originalUrl,
                                            canonicalUrl,
                                            platform: 'reddit',
                                            platformName: 'Reddit',
                                            title,
                                            author: {
                                                name: oembedAuthor || `r/${subreddit}`,
                                                username: oembedAuthor,
                                                profileUrl: oembedAuthor ? `https://reddit.com/${oembedAuthor}` : `https://reddit.com/r/${subreddit}`,
                                            },
                                            mediaType: 'image',
                                            thumbnailUrl: thumbUrl,
                                            formats,
                                            thumbnails: thumbnails.length > 0 ? thumbnails : undefined,
                                            officialViewUrl: canonicalUrl,
                                            fetchedAt: new Date().toISOString(),
                                        };
        }

        // If no media was found at all:
        if (socialRes.status === 'fulfilled' && socialRes.value && socialRes.value.status === 404) {
            throw new ExtractionError('DELETED_POST', 'This Reddit post was deleted or does not exist.', { officialUrl: targetUrl });
        }

        throw new ExtractionError(
            'NO_MEDIA_FOUND',
            'This Reddit post contains text only and does not contain downloadable media.',
            { officialUrl: canonicalUrl }
        );
    }

    private async resolveRedditVideoFormats(
        videoId: string,
        embedHtml: string,
        cleanTitle: string
    ): Promise<MediaFormatOption[]> {
        // Priority 1: packaged-media-json inside <shreddit-player>
        if (embedHtml) {
            const pkgMatch = embedHtml.match(/packaged-media-json="([^"]+)"/);
            if (pkgMatch) {
                try {
                    const jsonStr = decodeHtmlEntities(pkgMatch[1]);
                    const pkgData = JSON.parse(jsonStr);
                    const duration = pkgData.playbackMp4s?.duration || 0;
                    const rawPerms = pkgData.playbackMp4s?.permutations || [];

                    if (Array.isArray(rawPerms) && rawPerms.length > 0) {
                        const perms = [...rawPerms].sort((a, b) => {
                            const maxA = Math.max(a.source?.dimensions?.width || 0, a.source?.dimensions?.height || 0);
                            const maxB = Math.max(b.source?.dimensions?.width || 0, b.source?.dimensions?.height || 0);
                            return maxB - maxA;
                        });

                        const formats: MediaFormatOption[] = [];
                        for (const p of perms) {
                            const s = p.source;
                            if (!s?.url || !s.dimensions) continue;
                            const w = s.dimensions.width;
                            const h = s.dimensions.height;
                            const maxDim = Math.max(w, h);
                            const isFHD = maxDim >= 1080;
                            const isHD = maxDim >= 720;
                            const isSD = maxDim >= 480;
                            const labelPrefix = isFHD ? 'Full HD Video' : isHD ? 'HD Video' : isSD ? 'Standard Video' : 'Video';
                            const rawUrl = s.url.replace(/&amp;/g, '&');
                            const estSize = duration > 0 && s.bitrateBps > 0 ? Math.round((s.bitrateBps * duration) / 8) : undefined;

                            formats.push({
                                id: `reddit-v-${maxDim}p`,
                                label: `${labelPrefix} (${maxDim}p MP4)`,
                                format: 'mp4',
                                quality: `${maxDim}p (${w} × ${h})`,
                                resolution: `${w} × ${h}`,
                                downloadUrl: `/api/download?url=${encodeURIComponent(rawUrl)}&filename=${encodeURIComponent(`${cleanTitle}_${maxDim}p.mp4`)}`,
                                hasAudio: true,
                                fileSize: estSize,
                                fileSizeFormatted: estSize ? formatBytes(estSize) : undefined,
                                category: 'video',
                            });
                        }

                        // Add audio format: CMAF_AUDIO_128
                        const audioUrl = `https://v.redd.it/${videoId}/CMAF_AUDIO_128.mp4`;
                        formats.push({
                            id: 'reddit-audio',
                            label: 'Extracted Master Audio (M4A / MP3)',
                            format: 'm4a',
                            quality: '128 kbps',
                            downloadUrl: `/api/download?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(`${cleanTitle}_audio.m4a`)}`,
                            hasAudio: true,
                            category: 'audio',
                        });

                        return formats;
                    }
                } catch {
                    // Fall through to DASH playlist
                }
            }
        }

        // Priority 2: DASHPlaylist.mpd parser
        try {
            const mpdRes = await fetch(`https://v.redd.it/${videoId}/DASHPlaylist.mpd`, {
                signal: AbortSignal.timeout(6000),
            });
            if (mpdRes.ok) {
                const xml = await mpdRes.text();
                const repMatches = [...xml.matchAll(/<Representation\s+([^>]+)>([\s\S]*?)<\/Representation>/gi)];
                const videoReps: { width: number; height: number; url: string; bandwidth: number }[] = [];
                let audioUrl: string | null = null;

                for (const m of repMatches) {
                    const attrs = m[1];
                    const body = m[2];
                    const baseMatch = body.match(/<BaseURL>([^<]+)<\/BaseURL>/i);
                    const baseUrl = baseMatch ? baseMatch[1].trim() : null;
                    if (!baseUrl) continue;

                    const widthM = attrs.match(/width="(\d+)"/i);
                    const heightM = attrs.match(/height="(\d+)"/i);
                    const bandwidthM = attrs.match(/bandwidth="(\d+)"/i);

                    if (widthM && heightM) {
                        videoReps.push({
                            width: parseInt(widthM[1], 10),
                            height: parseInt(heightM[1], 10),
                            bandwidth: bandwidthM ? parseInt(bandwidthM[1], 10) : 0,
                            url: `https://v.redd.it/${videoId}/${baseUrl}`,
                        });
                    } else if (baseUrl.toLowerCase().includes('audio') && !audioUrl) {
                        audioUrl = `https://v.redd.it/${videoId}/${baseUrl}`;
                    }
                }

                if (videoReps.length > 0) {
                    videoReps.sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
                    const formats: MediaFormatOption[] = [];
                    for (const vr of videoReps) {
                        const maxDim = Math.max(vr.width, vr.height);
                        const isFHD = maxDim >= 1080;
                        const isHD = maxDim >= 720;
                        const isSD = maxDim >= 480;
                        const labelPrefix = isFHD ? 'Full HD Video' : isHD ? 'HD Video' : isSD ? 'Standard Video' : 'Video';

                        formats.push({
                            id: `reddit-v-${maxDim}p`,
                            label: `${labelPrefix} (${maxDim}p MP4)`,
                            format: 'mp4',
                            quality: `${maxDim}p (${vr.width} × ${vr.height})`,
                            resolution: `${vr.width} × ${vr.height}`,
                            downloadUrl: `/api/download?url=${encodeURIComponent(vr.url)}&filename=${encodeURIComponent(`${cleanTitle}_${maxDim}p.mp4`)}`,
                            hasAudio: false,
                            category: 'video',
                        });
                    }

                    if (audioUrl) {
                        formats.push({
                            id: 'reddit-audio',
                            label: 'Extracted Master Audio (M4A / MP3)',
                            format: 'm4a',
                            quality: '128 kbps',
                            downloadUrl: `/api/download?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(`${cleanTitle}_audio.m4a`)}`,
                            hasAudio: true,
                            category: 'audio',
                        });
                    }

                    return formats;
                }
            }
        } catch {
            // Fall through to fallback
        }

        // Priority 3: Fallback standard stream
        const fallbackVideo = `https://v.redd.it/${videoId}/CMAF_480.mp4`;
        const fallbackAudio = `https://v.redd.it/${videoId}/CMAF_AUDIO_128.mp4`;
        return [
            {
                id: 'reddit-v-fallback',
                label: 'Standard Video (MP4)',
                format: 'mp4',
                quality: 'Standard Quality',
                downloadUrl: `/api/download?url=${encodeURIComponent(fallbackVideo)}&filename=${encodeURIComponent(`${cleanTitle}.mp4`)}`,
                hasAudio: false,
                category: 'video',
            },
            {
                id: 'reddit-audio',
                label: 'Extracted Master Audio (M4A / MP3)',
                format: 'm4a',
                quality: '128 kbps',
                downloadUrl: `/api/download?url=${encodeURIComponent(fallbackAudio)}&filename=${encodeURIComponent(`${cleanTitle}_audio.m4a`)}`,
                hasAudio: true,
                category: 'audio',
            },
        ];
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
