import { GalleryItem, MediaFormatOption, MediaResult, MediaSourceType, MediaType } from '@/types/media';
import { ExtractionError, PlatformAdapter } from './base';
import { sanitizeFilename } from '@/lib/security';
import { decodeHtmlEntities } from '@/lib/html-entities';

function unescapeMetaUrl(str: string): string {
    if (!str) return '';
    return str
        .replace(/\\u0026/g, '&')
        .replace(/&amp;/g, '&')
        .replace(/\\u00253D/gi, '=')
        .replace(/\\\//g, '/');
}

/**
 * Extracts the raw JSON media object from Threads HTML SSR payload.
 * Threads embeds the full Post metadata inside RelayPrefetchedStreamCache / ScheduledServerJS:
 * {"__bbox":{"complete":true,"result":{"data":{"media":{ ... }}}}}
 */
function extractThreadsMediaPayload(html: string, shortcode?: string): any | null {
    // Strategy 1: Find "data":{"media":{ and extract via balanced brace parsing
    let searchStart = 0;
    while (true) {
        const mediaIdx = html.indexOf('"data":{"media":{', searchStart);
        if (mediaIdx === -1) break;

            const startIdx = mediaIdx + '"data":{"media":'.length;
            let depth = 0;
            let inString = false;
            let escape = false;
            let endIdx = -1;

            for (let i = startIdx; i < html.length; i++) {
                const char = html[i];
                if (escape) {
                    escape = false;
                    continue;
                }
                if (char === '\\') {
                    escape = true;
                    continue;
                }
                if (char === '"') {
                    inString = !inString;
                    continue;
                }
                if (!inString) {
                    if (char === '{') depth++;
                    else if (char === '}') {
                        depth--;
                        if (depth === 0) {
                            endIdx = i + 1;
                            break;
                        }
                    }
                }
            }

            if (endIdx !== -1) {
                try {
                    const jsonStr = html.slice(startIdx, endIdx);
                    const media = JSON.parse(jsonStr);
                    if (media && (media.image_versions2 || media.video_versions || media.carousel_media)) {
                        // If shortcode was provided, verify it matches or return first found
                        if (!shortcode || media.code === shortcode) {
                            return media;
                        }
                    }
                } catch {
                    // Ignore parse errors and keep looking
                }
            }

                searchStart = mediaIdx + 17;
            }

            // Strategy 2: If shortcode search didn't match directly, try finding the shortcode anchor
            if (shortcode) {
                const codeAnchor = `"code":"${shortcode}"`;
                const codeIdx = html.indexOf(codeAnchor);
                if (codeIdx !== -1) {
                    // Find nearest "image_versions2" or "video_versions"
                    const imgVerIdx = html.indexOf('"image_versions2":', Math.max(0, codeIdx - 500));
                    if (imgVerIdx !== -1 && Math.abs(imgVerIdx - codeIdx) < 1500) {
                        const candidatesMatch = html.slice(imgVerIdx, imgVerIdx + 2000).match(/"candidates":\s*(\[[^\]]+\])/);
                        if (candidatesMatch && candidatesMatch[1]) {
                            try {
                                const candidates = JSON.parse(candidatesMatch[1]);
                                return {
                                    code: shortcode,
                                    media_type: 1,
                                    image_versions2: { candidates },
                                };
                            } catch {
                                // Ignore
                            }
                        }
                    }
                }
            }

                return null;
            }

        export class ThreadsAdapter implements PlatformAdapter {
            public id = 'threads' as const;
            public name = 'Threads';
            public iconName = 'AtSign';

    public canHandle(url: string, parsedUrl ?: URL): boolean {
            try {
                const u = parsedUrl || new URL(url);
                const host = u.hostname.toLowerCase();
                return (
                    host === 'threads.net' ||
                    host.endsWith('.threads.net') ||
                    host === 'threads.com' ||
                    host.endsWith('.threads.com')
                );
            } catch {
                return false;
            }
        }

    public async extract(url: string): Promise < MediaResult > {
            const targetUrl = url;
            let html = '';
            let finalUrl = url;

            // Fetch with follow-redirects using social crawler User-Agent
            try {
                const res = await fetch(targetUrl, {
                    redirect: 'follow',
                    headers: {
                        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
                        'Accept': 'text/html,application/xhtml+xml',
                        'Accept-Language': 'en-US,en;q=0.9',
                    },
                    signal: AbortSignal.timeout(10000),
                });

                finalUrl = res.url || targetUrl;
                if(!res.ok && res.status !== 404) {
            throw new Error(`Upstream returned HTTP ${res.status}`);
        }
        html = await res.text();
    } catch (err) {
        throw new ExtractionError('FETCH_FAILED', 'Failed to inspect Threads post.', {
            details: (err as Error).message,
            officialUrl: url,
        });
    }

    // Check if post was removed or deleted
    if (html.includes('Page Not Found') && html.length < 5000) {
        throw new ExtractionError('DELETED_POST', 'This Threads post was removed or does not exist.', {
            officialUrl: finalUrl,
        });
    }

    // Extract shortcode from final canonical URL
    const shortcodeMatch = finalUrl.match(/post\/([A-Za-z0-9_-]+)/);
    const shortcode = shortcodeMatch ? shortcodeMatch[1] : undefined;

    // 1. Parse rich first-party media payload
    const media = extractThreadsMediaPayload(html, shortcode);

    // 2. Author and Title Extraction
    let authorName = media?.user?.full_name || 'Threads User';
    let authorHandle = media?.user?.username ? `@${media.user.username}` : undefined;
    let authorAvatar = media?.user?.profile_pic_url ? unescapeMetaUrl(media.user.profile_pic_url) : undefined;
    let rawCaption = media?.caption?.text;

    // Fallback to meta tags if media object did not supply author/caption
    if (!rawCaption) {
        const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
        if (descMatch && descMatch[1]) {
            rawCaption = decodeHtmlEntities(descMatch[1].trim());
        }
    }

    if (!authorHandle) {
        const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
        if (titleMatch && titleMatch[1]) {
            const rawTitle = titleMatch[1].replace(/ on Threads$/i, '');
            const handleMatch = rawTitle.match(/\((?:&#064;|@)([^)]+)\)/);
            if (handleMatch) {
                authorHandle = `@${handleMatch[1]}`;
                const namePart = rawTitle.split('(')[0].trim();
                authorName = decodeHtmlEntities(namePart || authorHandle);
            } else {
                authorName = decodeHtmlEntities(rawTitle);
            }
        }
    }

    const title = rawCaption
        ? decodeHtmlEntities(rawCaption.trim())
        : authorHandle
            ? `Threads post by ${authorName} (${authorHandle})`
            : 'Threads Post';

    const cleanTitle = sanitizeFilename(
        title.replace(/[\r\n]+/g, ' ').substring(0, 50),
        'Threads_Media'
    );

                // 3. Inspect OpenGraph image to distinguish post-card preview from actual media
                let ogImage = '';
                const imgMatch =
                    html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                    html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
                if (imgMatch && imgMatch[1]) {
                    ogImage = unescapeMetaUrl(imgMatch[1]);
                }

                // Flag if ogImage is a rendered social preview card (contains t39.92108-6 or t39.)
                const isOgCard = Boolean(ogImage && (ogImage.includes('t39.92108-6') || ogImage.includes('/t39.')));

                const formats: MediaFormatOption[] = [];
                const thumbnails: MediaFormatOption[] = [];
                const gallery: GalleryItem[] = [];

                // 4. Case A: Carousel Media (media_type === 8 or has carousel_media)
                if (media?.carousel_media && Array.isArray(media.carousel_media) && media.carousel_media.length > 0) {
                    media.carousel_media.forEach((item: any, idx: number) => {
                        const itemIsVideo = item.media_type === 2 || Boolean(item.video_versions?.length);
                        let mediaUrl = '';
                        let thumbUrl = '';
                        let itemResolution = '';

                        if (itemIsVideo && item.video_versions?.length) {
                            // Sort video versions descending
                            const vids = [...item.video_versions].sort(
                                (a: any, b: any) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0)
                            );
                            mediaUrl = unescapeMetaUrl(vids[0].url);
                            if (item.image_versions2?.candidates?.length) {
                                thumbUrl = unescapeMetaUrl(item.image_versions2.candidates[0].url);
                            }
                            if (vids[0].width && vids[0].height) {
                                itemResolution = `${vids[0].width}x${vids[0].height}`;
                            }
                        } else if (item.image_versions2?.candidates?.length) {
                            const cands = [...item.image_versions2.candidates].sort(
                                (a: any, b: any) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0)
                            );
                            mediaUrl = unescapeMetaUrl(cands[0].url);
                            thumbUrl = mediaUrl;
                            itemResolution = `${item.original_width || cands[0].width}x${item.original_height || cands[0].height}`;
                        }

                            if (mediaUrl) {
                                gallery.push({
                                    id: `threads-carousel-${idx + 1}`,
                                    type: itemIsVideo ? 'video' : 'image',
                                    url: mediaUrl,
                                    thumbnailUrl: thumbUrl || mediaUrl,
                                    resolution: itemResolution,
                                    format: itemIsVideo ? 'mp4' : 'jpg',
                                    sourceType: itemIsVideo ? 'ORIGINAL_VIDEO' : 'ORIGINAL_IMAGE',
                                });
                            }
                        });
                    }

                    // 5. Case B: Video Post (media_type === 2 or has video_versions)
                    let primaryVideoUrl = '';
                    if (media?.video_versions && Array.isArray(media.video_versions) && media.video_versions.length > 0) {
                        const vids = [...media.video_versions].sort(
                            (a: any, b: any) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0)
                        );
                        primaryVideoUrl = unescapeMetaUrl(vids[0].url);
                    } else if (!media) {
                        // Regex fallback for video if media object was omitted
                        const rawMp4Match = html.match(/"(?:url|playable_url)":\s*"([^"]+\.mp4[^"]*)"/i);
                        if (rawMp4Match && rawMp4Match[1]) {
                            primaryVideoUrl = unescapeMetaUrl(rawMp4Match[1]);
                        }
                    }

                                // 6. Case C: Single Original Image Attachment
                                let originalImageUrl = '';
                                let originalResolution = '';
                                const imageCandidates: Array<{ url: string; width: number; height: number }> = [];

                                if (media?.image_versions2?.candidates && Array.isArray(media.image_versions2.candidates)) {
                                    // Sort candidates descending by pixel area
                                    const cands = [...media.image_versions2.candidates].sort(
                                        (a: any, b: any) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0)
                                    );
                                    cands.forEach((c: any) => {
                                        if (c.url) {
                                            imageCandidates.push({
                                                url: unescapeMetaUrl(c.url),
                                                width: c.width || media.original_width || 0,
                                                height: c.height || media.original_height || 0,
                                            });
                                        }
                                    });

                                    if (imageCandidates.length > 0) {
                                        originalImageUrl = imageCandidates[0].url;
                                        const w = imageCandidates[0].width || media.original_width;
                                        const h = imageCandidates[0].height || media.original_height;
                                        if (w && h) originalResolution = `${w}x${h}`;
                                    }
                                }

                            // Determine Media Classification
                            const isVideo = Boolean(primaryVideoUrl);
                            const isGallery = gallery.length > 1;
                            const isImage = !isVideo && (Boolean(originalImageUrl) || (!isOgCard && Boolean(ogImage)));

                            // If no genuine attached media could be found
                            if (!isVideo && !isGallery && !isImage) {
                                throw new ExtractionError(
                                    'NO_MEDIA_FOUND',
                                    'This Threads post does not contain downloadable original media (it may be a text-only post or requires login). OpenGraph preview cards and screenshots are excluded to ensure only original media is delivered.',
                                    { officialUrl: finalUrl }
                                );
                            }

                            let mediaType: MediaType = 'image';
                            let previewThumbnail = '';

                                if (isVideo) {
                                        mediaType = 'video';
                                        // For video: preview thumbnail is the video frame poster, NOT the post-card!
                                        const videoThumb = originalImageUrl || (imageCandidates[0]?.url) || (!isOgCard ? ogImage : '');
                                        previewThumbnail = videoThumb || primaryVideoUrl;

                                        formats.push({
                                            id: 'threads-video-hd',
                                            label: 'Threads Video (HD MP4)',
                                            format: 'mp4',
                                            quality: 'High Definition',
                                            downloadUrl: `/api/download?url=${encodeURIComponent(primaryVideoUrl)}&filename=${encodeURIComponent(`${cleanTitle}.mp4`)}`,
                                            hasAudio: true,
                                            category: 'video',
                                            sourceType: 'ORIGINAL_VIDEO',
                                        });

                                        if (videoThumb) {
                                            thumbnails.push({
                                                id: 'threads-video-poster',
                                                label: 'Video Frame Poster (JPG)',
                                                format: 'jpg',
                                                quality: originalResolution || 'Original Resolution',
                                                resolution: originalResolution,
                                                downloadUrl: `/api/download?url=${encodeURIComponent(videoThumb)}&filename=${encodeURIComponent(`${cleanTitle}_poster.jpg`)}`,
                                                category: 'thumbnail',
                                                sourceType: 'VIDEO_THUMBNAIL',
                                            });
                                        }
                                    } else if (isGallery) {
                                        mediaType = 'gallery';
                                        previewThumbnail = gallery[0].thumbnailUrl || gallery[0].url;

                                        formats.push({
                                            id: 'threads-gallery-first',
                                            label: `Primary Media (1 of ${gallery.length} in Carousel)`,
                                            format: gallery[0].format,
                                            quality: gallery[0].resolution || 'Original Resolution',
                                            resolution: gallery[0].resolution,
                                            downloadUrl: `/api/download?url=${encodeURIComponent(gallery[0].url)}&filename=${encodeURIComponent(`${cleanTitle}_item_1.${gallery[0].format}`)}`,
                                            category: gallery[0].type,
                                            sourceType: gallery[0].sourceType,
                                        });
                                    } else {
                                        // Single Genuine Attached Image
                                        mediaType = 'image';
                                        // Pure original attached image URL (never the post card!)
                                        const targetImgUrl = originalImageUrl || ogImage;
                                        previewThumbnail = targetImgUrl;

                                        // Primary format: Highest resolution available
                                        formats.push({
                                            id: 'threads-image-original',
                                            label: `Original Master Photo (${originalResolution || 'High-Res'} JPG)`,
                                            format: 'jpg',
                                            quality: 'Original Master Resolution',
                                            resolution: originalResolution,
                                            downloadUrl: `/api/download?url=${encodeURIComponent(targetImgUrl)}&filename=${encodeURIComponent(`${cleanTitle}.jpg`)}`,
                                            category: 'image',
                                            sourceType: 'ORIGINAL_IMAGE',
                                        });

                                        // If a secondary high-quality candidate exists (e.g. 1080x1080), offer it as an option
                                        if (imageCandidates.length > 1 && imageCandidates[1].width && imageCandidates[1].width < (imageCandidates[0].width || 9999)) {
                                            const second = imageCandidates[1];
                                            formats.push({
                                                id: 'threads-image-hq',
                                                label: `High Quality Photo (${second.width}x${second.height} JPG)`,
                                                format: 'jpg',
                                                quality: `${second.width}x${second.height}`,
                                                resolution: `${second.width}x${second.height}`,
                                                downloadUrl: `/api/download?url=${encodeURIComponent(second.url)}&filename=${encodeURIComponent(`${cleanTitle}_${second.width}p.jpg`)}`,
                                                category: 'image',
                                                sourceType: 'ORIGINAL_IMAGE',
                                            });
                                        }
                                    }

                                    return {
                                        id: `threads-${Buffer.from(finalUrl).toString('base64url').substring(0, 16)}`,
                                        originalUrl: url,
                                        canonicalUrl: finalUrl,
                                        platform: 'threads',
                                        platformName: isVideo ? 'Threads Video' : 'Threads',
                                        title,
                                        description: title !== 'Threads Post' ? title : undefined,
                                        author: {
                                            name: authorName,
                                            username: authorHandle,
                                            avatarUrl: authorAvatar,
                                            profileUrl: authorHandle ? `https://www.threads.com/${authorHandle}` : undefined,
                                        },
                                        mediaType,
                                        thumbnailUrl: previewThumbnail,
                                        dimensions: media?.original_width && media?.original_height
                                            ? { width: media.original_width, height: media.original_height }
                                            : undefined,
                                        formats,
                                        thumbnails: thumbnails.length > 0 ? thumbnails : undefined,
                                        gallery: gallery.length > 0 ? gallery : undefined,
                                        complianceNotice:
                                            'Downloads of public Threads media deliver the authentic original attachment without post-card overlays.',
                                        officialViewUrl: finalUrl,
                                        fetchedAt: new Date().toISOString(),
                                    };
                                }
                            }
