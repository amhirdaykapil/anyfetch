import { MediaFormatOption, MediaResult, MediaType, GalleryItem } from '@/types/media';
import { ExtractionError, PlatformAdapter } from './base';
import { sanitizeFilename } from '@/lib/security';
import { decodeHtmlEntities } from '@/lib/html-entities';

export class InstagramAdapter implements PlatformAdapter {
    public id = 'instagram' as const;
    public name = 'Instagram';
    public iconName = 'Instagram';

    public canHandle(url: string, parsedUrl?: URL): boolean {
        try {
            const u = parsedUrl || new URL(url);
            const host = u.hostname.toLowerCase();
            return host === 'instagram.com' || host.endsWith('.instagram.com');
        } catch {
            return false;
        }
    }

    private extractShortcode(url: string): string | null {
        const match = url.match(/\/(p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);
        return match ? match[2] : null;
    }

    public async extract(url: string): Promise<MediaResult> {
        const shortcode = this.extractShortcode(url);
        if (!shortcode) {
            throw new ExtractionError(
                'INVALID_URL',
                'Invalid Instagram URL. Please provide a link to a public post or Reel.',
                { officialUrl: url }
            );
        }

        const canonicalUrl = `https://www.instagram.com/p/${shortcode}/`;
        const isReel = url.includes('/reel') || url.includes('/reels/');
        const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || process.env.META_ACCESS_TOKEN?.trim();

        // 1. If Meta / Instagram Access Token is configured, attempt Graph API / official oEmbed
        if (accessToken) {
            try {
                const oembedUrl = `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(canonicalUrl)}&access_token=${encodeURIComponent(accessToken)}`;
                const oembedRes = await fetch(oembedUrl, {
                    signal: AbortSignal.timeout(6000),
                });
                if (oembedRes.ok) {
                    const data = await oembedRes.json();
                    const title = decodeHtmlEntities(data.title || `Instagram ${isReel ? 'Reel' : 'Post'} by ${data.author_name || 'Creator'}`);
                    const cleanTitle = sanitizeFilename(title.substring(0, 50), `Instagram_${shortcode}`);
                    const formats: MediaFormatOption[] = [];

                    if (data.thumbnail_url) {
                        formats.push({
                            id: 'ig-thumb-hq',
                            label: isReel ? 'Reel Cover Photo (JPG)' : 'High Resolution Photo (JPG)',
                            format: 'jpg',
                            quality: 'High Quality',
                            downloadUrl: `/api/download?url=${encodeURIComponent(data.thumbnail_url)}&filename=${encodeURIComponent(`${cleanTitle}.jpg`)}`,
                            category: isReel ? 'thumbnail' : 'image',
                        });
                    }

                    return {
                        id: `instagram-${shortcode}`,
                        originalUrl: url,
                        canonicalUrl,
                        platform: 'instagram',
                        platformName: isReel ? 'Instagram Reel' : 'Instagram',
                        title,
                        author: data.author_name
                            ? {
                                name: data.author_name,
                                username: `@${data.author_name}`,
                                profileUrl: data.author_url || `https://instagram.com/${data.author_name}`,
                            }
                            : undefined,
                        mediaType: isReel ? 'video' : 'image',
                        thumbnailUrl: data.thumbnail_url || '',
                        formats,
                        complianceNotice:
                            'In accordance with Meta Platform Terms, Instagram media is retrieved via authorized endpoints.',
                        officialViewUrl: canonicalUrl,
                        fetchedAt: new Date().toISOString(),
                    };
                }
            } catch {
                // Fallback to public embed scraping
            }
        }

        // 2. Public embed extraction
        const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
        let html = '';

        try {
            const res = await fetch(embedUrl, {
                headers: {
                    'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                signal: AbortSignal.timeout(8000),
            });

            if (!res.ok) {
                if (res.status === 404) {
                    throw new ExtractionError('DELETED_POST', 'This Instagram post does not exist or has been deleted.', {
                        officialUrl: canonicalUrl,
                    });
                }
                throw new ExtractionError(
                    'RESTRICTED_CONTENT',
                    accessToken
                        ? 'This Instagram post is private, age-gated, or restricted.'
                        : 'Instagram requires authentication to access this content. To enable Instagram downloads, configure INSTAGRAM_ACCESS_TOKEN. Direct media links and public oEmbed-eligible posts are supported.',
                    { officialUrl: canonicalUrl }
                );
            }

            html = await res.text();
        } catch (err) {
            if (err instanceof ExtractionError) throw err;
            throw new ExtractionError('FETCH_FAILED', 'Failed to fetch Instagram public embed.', {
                details: (err as Error).message,
                officialUrl: canonicalUrl,
            });
        }

        // Check if login wall
            if (html.includes('Login • Instagram') || html.includes('Page Not Found') || html.includes('login_required')) {
                throw new ExtractionError(
                    'PRIVATE_CONTENT',
                    accessToken
                        ? 'This post belongs to a private account or requires authentication to view.'
                        : 'Instagram requires authentication to access this content. To enable Instagram downloads, configure INSTAGRAM_ACCESS_TOKEN. Direct media links and public oEmbed-eligible posts are supported.',
                    { officialUrl: canonicalUrl }
                );
            }

            // Extract author
            let authorName = 'Instagram Creator';
            const authorMatch =
                html.match(/class=["']Username["'][^>]*>([^<]+)</i) ||
                html.match(/class=["']HoverCard["'][^>]*>([^<]+)</i);
            if (authorMatch && authorMatch[1]) {
                authorName = decodeHtmlEntities(authorMatch[1].trim());
            }

            // Extract caption / title
            let title = `Instagram ${isReel ? 'Reel' : 'Post'} by ${authorName}`;
            const captionMatch = html.match(/class=["']Caption["'][^>]*>([\s\S]*?)<\/div>/i);
            if (captionMatch && captionMatch[1]) {
                const text = decodeHtmlEntities(captionMatch[1].replace(/<[^>]+>/g, '').trim());
                if (text) title = text;
            }

            // Extract image
            let imageUrl = '';
            const imgMatch =
                html.match(/class=["']EmbeddedMediaImage["'][^>]*src=["']([^"']+)["']/i) ||
                html.match(/<img[^>]*class=["'][^"']*ContentImage[^"']*["'][^>]*src=["']([^"']+)["']/i);
            if (imgMatch && imgMatch[1]) {
                imageUrl = imgMatch[1].replace(/&amp;/g, '&');
            }

            // Extract video if present
            let videoUrl = '';
            const vidMatch =
                html.match(/<video[^>]*src=["']([^"']+)["']/i) ||
                html.match(/"video_url":\s*"([^"]+)"/i);
            if (vidMatch && vidMatch[1]) {
                videoUrl = vidMatch[1].replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
            }

            if (!imageUrl && !videoUrl) {
                throw new ExtractionError(
                    'RESTRICTED_CONTENT',
                    accessToken
                        ? 'Could not retrieve downloadable media for this post. It may be restricted by Instagram API controls.'
                        : 'Instagram requires authentication to access this content. To enable Instagram downloads, configure INSTAGRAM_ACCESS_TOKEN. Direct media links and public oEmbed-eligible posts are supported.',
                    { officialUrl: canonicalUrl }
                );
            }

            const cleanTitle = sanitizeFilename(title.substring(0, 50), `Instagram_${shortcode}`);
            const formats: MediaFormatOption[] = [];
            const thumbnails: MediaFormatOption[] = [];
            const isVideo = Boolean(videoUrl || isReel);

            if (videoUrl) {
                formats.push({
                    id: 'ig-video-hd',
                    label: isReel ? 'Reel Video (HD MP4)' : 'Post Video (HD MP4)',
                    format: 'mp4',
                    quality: 'High Definition',
                    downloadUrl: `/api/download?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(`${cleanTitle}.mp4`)}`,
                    hasAudio: true,
                    category: 'video',
                });
            }

            if (imageUrl) {
                if (isVideo) {
                    thumbnails.push({
                        id: 'ig-thumb-poster',
                        label: 'Cover Poster (JPG)',
                        format: 'jpg',
                        quality: 'Original Quality',
                        downloadUrl: `/api/download?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(`${cleanTitle}_poster.jpg`)}`,
                        category: 'thumbnail',
                    });
                } else {
                    formats.push({
                        id: 'ig-photo-hd',
                        label: 'High Resolution Photo (JPG)',
                        format: 'jpg',
                        quality: 'Original Resolution',
                        downloadUrl: `/api/download?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(`${cleanTitle}.jpg`)}`,
                        category: 'image',
                    });
                }
            }

            return {
                id: `instagram-${shortcode}`,
                originalUrl: url,
                canonicalUrl,
                platform: 'instagram',
                platformName: isReel ? 'Instagram Reel' : 'Instagram',
                title,
                author: {
                    name: authorName,
                    username: `@${authorName}`,
                    profileUrl: `https://instagram.com/${authorName}`,
                },
                mediaType: isVideo ? 'video' : 'image',
                thumbnailUrl: imageUrl || videoUrl,
                formats,
                thumbnails: thumbnails.length > 0 ? thumbnails : undefined,
                complianceNotice:
                    'Only publicly accessible Instagram content is downloadable in accordance with Meta Platform Terms.',
                officialViewUrl: canonicalUrl,
                fetchedAt: new Date().toISOString(),
            };
        }
    }
