import { GalleryItem, MediaFormatOption, MediaResult, MediaType } from '@/types/media';
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

    export class ThreadsAdapter implements PlatformAdapter {
        public id = 'threads' as const;
        public name = 'Threads';
        public iconName = 'AtSign';

        public canHandle(url: string, parsedUrl?: URL): boolean {
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

        public async extract(url: string): Promise<MediaResult> {
            let targetUrl = url;

            // Multi-step resolution: fetch with follow-redirects using social crawler User-Agent
            let html = '';
            let finalUrl = url;

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
                        if (!res.ok && res.status !== 404) {
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

                    // 1. Title and Author Extraction
                    let title = 'Threads Post';
                    let authorName = 'Threads User';
                    let authorHandle: string | undefined;

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

            const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
            if (descMatch && descMatch[1]) {
                title = decodeHtmlEntities(descMatch[1].trim());
            } else if (authorHandle) {
                title = `Threads post by ${authorName} (${authorHandle})`;
            }

            // 2. Poster / Thumbnail Extraction
            let ogImage = '';
            const imgMatch =
                html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
            if (imgMatch && imgMatch[1]) {
                ogImage = unescapeMetaUrl(imgMatch[1]);
            }

            // 3. Video Extraction from video_versions or direct scripts
            let videoUrl = '';
            const vidVersionsMatch = html.match(/"video_versions":\s*(\[[^\]]+\])/);
            if (vidVersionsMatch && vidVersionsMatch[1]) {
                try {
                    const parsedVersions = JSON.parse(vidVersionsMatch[1]);
                    if (Array.isArray(parsedVersions) && parsedVersions.length > 0) {
                        // Sort by resolution descending
                        parsedVersions.sort((a: any, b: any) => ((b.width || 0) * (b.height || 0)) - ((a.width || 0) * (a.height || 0)));
                        videoUrl = unescapeMetaUrl(parsedVersions[0].url);
                    }
                } catch {
                    // Fallback to regex
                }
            }

            if (!videoUrl) {
                const rawMp4Match = html.match(/"(?:url|playable_url)":\s*"([^"]+\.mp4[^"]*)"/i);
                if (rawMp4Match && rawMp4Match[1]) {
                    videoUrl = unescapeMetaUrl(rawMp4Match[1]);
                }
            }

        // 4. Carousel / Multi-image Extraction
        const gallery: GalleryItem[] = [];
        const carouselMatch = html.match(/"carousel_media":\s*(\[[^\]]+\])/);
        if(carouselMatch && carouselMatch[1]) {
        try {
            const carouselItems = JSON.parse(carouselMatch[1]);
            if (Array.isArray(carouselItems)) {
                carouselItems.forEach((item: any, idx: number) => {
                    const itemVid = item.video_versions?.[0]?.url;
                    const itemImg = item.image_versions2?.candidates?.[0]?.url;
                    const mediaUrl = itemVid ? unescapeMetaUrl(itemVid) : itemImg ? unescapeMetaUrl(itemImg) : '';
                    if (mediaUrl) {
                        gallery.push({
                            id: `threads-item-${idx + 1}`,
                            type: itemVid ? 'video' : 'image',
                            url: mediaUrl,
                            thumbnailUrl: itemImg ? unescapeMetaUrl(itemImg) : undefined,
                            format: itemVid ? 'mp4' : 'jpg',
                        });
                    }
                });
            }
        } catch {
            // Fallback
        }
    }

    if (!videoUrl && !ogImage && gallery.length === 0) {
        throw new ExtractionError(
            'NO_MEDIA_FOUND',
            'This Threads post does not contain downloadable images or videos, or requires authentication to view.',
            { officialUrl: finalUrl }
        );
    }

    const cleanTitle = sanitizeFilename(title.substring(0, 50), 'Threads_Media');
    const formats: MediaFormatOption[] = [];
    const thumbnails: MediaFormatOption[] = [];
    const isVideo = Boolean(videoUrl);
    const mediaType: MediaType = isVideo ? 'video' : gallery.length > 1 ? 'gallery' : 'image';

    if (videoUrl) {
        formats.push({
            id: 'threads-video-hd',
            label: 'Threads Video (HD MP4)',
            format: 'mp4',
            quality: 'High Definition',
            downloadUrl: `/api/download?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(`${cleanTitle}.mp4`)}`,
            hasAudio: true,
            category: 'video',
        });
    }

    if (ogImage) {
        if (isVideo) {
            thumbnails.push({
                id: 'threads-image-poster',
                label: 'Master Video Poster (JPG)',
                format: 'jpg',
                quality: 'Original Resolution',
                downloadUrl: `/api/download?url=${encodeURIComponent(ogImage)}&filename=${encodeURIComponent(`${cleanTitle}_poster.jpg`)}`,
                category: 'thumbnail',
            });
        } else if (gallery.length <= 1) {
            formats.push({
                id: 'threads-image-hq',
                label: 'High Resolution Photo (JPG)',
                format: 'jpg',
                quality: 'Original Resolution',
                downloadUrl: `/api/download?url=${encodeURIComponent(ogImage)}&filename=${encodeURIComponent(`${cleanTitle}.jpg`)}`,
                category: 'image',
            });
        }
    }

    if (gallery.length > 1) {
        formats.push({
            id: 'threads-gallery-first',
            label: `Primary Media (1 of ${gallery.length} in Carousel)`,
            format: gallery[0].format,
            quality: 'Original Quality',
            downloadUrl: `/api/download?url=${encodeURIComponent(gallery[0].url)}&filename=${encodeURIComponent(`${cleanTitle}_item_1.${gallery[0].format}`)}`,
            category: gallery[0].type,
        });
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
            profileUrl: authorHandle ? `https://www.threads.com/${authorHandle}` : undefined,
        },
        mediaType,
        thumbnailUrl: ogImage || videoUrl,
        formats,
        thumbnails: thumbnails.length > 0 ? thumbnails : undefined,
        gallery: gallery.length > 1 ? gallery : undefined,
        complianceNotice:
            'Downloads of public Threads media are subject to creator permissions and Meta Platform Terms.',
        officialViewUrl: finalUrl,
        fetchedAt: new Date().toISOString(),
    };
}
}
