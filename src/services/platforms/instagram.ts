import { MediaFormatOption, MediaResult, MediaType, GalleryItem } from '@/types/media';
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

export class InstagramAdapter implements PlatformAdapter {
    public id = 'instagram' as const;
    public name = 'Instagram';
    public iconName = 'Instagram';

  public canHandle(url: string, parsedUrl?: URL): boolean {
        try {
            const u = parsedUrl || new URL(url);
            const host = u.hostname.toLowerCase();
            return (
                host === 'instagram.com' ||
                host.endsWith('.instagram.com') ||
                host.includes('cdninstagram.com') ||
                (host.includes('fbcdn.net') && (u.pathname.includes('/v/t51.') || u.pathname.includes('/v/t16.')))
            );
        } catch {
            return false;
        }
    }

  private extractShortcode(url: string): string | null {
        const match = url.match(/\/(p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);
        return match ? match[2] : null;
    }

    public async extract(url: string): Promise<MediaResult> {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();

        // 1. Direct Instagram CDN media asset (instant download without credentials)
        if (host.includes('cdninstagram.com') || host.includes('fbcdn.net')) {
            const isVideo = url.includes('.mp4') || parsed.pathname.includes('/v/t16/');
            const ext = isVideo ? 'mp4' : 'jpg';
            const cleanTitle = sanitizeFilename(parsed.pathname.split('/').pop() || 'instagram_media', 'Instagram_Media');

            return {
                id: `instagram-${cleanTitle}`,
                originalUrl: url,
                canonicalUrl: url,
                platform: 'instagram',
                platformName: isVideo ? 'Instagram Reel Video' : 'Instagram Photo',
                title: cleanTitle,
                mediaType: isVideo ? 'video' : 'image',
                thumbnailUrl: url,
                formats: [
                    {
                        id: 'ig-direct-media',
                        label: isVideo ? 'High Definition Video (MP4)' : 'Original High-Res Photo (JPG)',
                        format: ext,
                        quality: 'Original Resolution',
                        downloadUrl: `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(`${cleanTitle}.${ext}`)}`,
                        isDirect: true,
                        hasAudio: isVideo,
                        category: isVideo ? 'video' : 'image',
                    },
                ],
                officialViewUrl: url,
                fetchedAt: new Date().toISOString(),
            };
        }

        const shortcode = this.extractShortcode(url);
        if (!shortcode) {
            throw new ExtractionError(
                'INVALID_URL',
                'Invalid Instagram URL. Please provide a link to a public post or Reel (e.g. instagram.com/p/... or /reel/...).',
                { officialUrl: url }
            );
        }

        const canonicalUrl = `https://www.instagram.com/p/${shortcode}/`;
        const isReel = url.includes('/reel') || url.includes('/reels/');

                    // 2. RapidAPI Commercial Provider Integration (if RAPIDAPI_KEY is configured)
                    const rapidApiKey = process.env.RAPIDAPI_KEY?.trim() || process.env.INSTAGRAM_RAPIDAPI_KEY?.trim();
                    if (rapidApiKey) {
                        try {
                            const rapidApiRes = await fetch(
                                `https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com/index?url=${encodeURIComponent(canonicalUrl)}`,
                                {
                                    headers: {
                                        'x-rapidapi-key': rapidApiKey,
                                        'x-rapidapi-host': 'instagram-downloader-download-instagram-videos-stories.p.rapidapi.com',
                                    },
                                    signal: AbortSignal.timeout(8000),
                                }
                            );

                            if (rapidApiRes.ok) {
                                const data = await rapidApiRes.json();
                                const rawCarousel =
                                    data.carousel_media ||
                                    data.sidecar ||
                                    data.medias ||
                                    (Array.isArray(data.children) ? data.children : data.children?.data) ||
                                    (Array.isArray(data.items) ? data.items : null) ||
                                    (Array.isArray(data.media) ? data.media : null);

                                if (Array.isArray(rawCarousel) && rawCarousel.length > 1) {
                                    const title = decodeHtmlEntities(data.title || `Instagram Carousel Post (${shortcode})`);
                                    const cleanTitle = sanitizeFilename(title.substring(0, 50), `Instagram_${shortcode}`);
                                    const gallery: GalleryItem[] = [];
                                    const formats: MediaFormatOption[] = [];

                                    for (let idx = 0; idx < rawCarousel.length; idx++) {
                                        const cItem = rawCarousel[idx];
                                        const itemUrl = cItem.url || cItem.media || cItem.download_url || cItem.display_url || cItem.video_url;
                                        if (!itemUrl) continue;
                                        const isItemVid = Boolean(cItem.is_video || cItem.type === 'video' || itemUrl.includes('.mp4'));
                                        const ext = isItemVid ? 'mp4' : 'jpg';
                                        const slideNum = String(idx + 1).padStart(2, '0');
                                        const dlFilename = `OmniFetch_Slide_${slideNum}.${ext}`;
                                        const thumb = cItem.thumbnail || cItem.display_url || cItem.thumbnailUrl || itemUrl;

                                        gallery.push({
                                            id: `ig-carousel-${idx + 1}`,
                                            position: idx + 1,
                                            type: isItemVid ? 'video' : 'image',
                                            url: itemUrl,
                                            downloadUrl: `/api/download?url=${encodeURIComponent(itemUrl)}&filename=${encodeURIComponent(dlFilename)}`,
                                            thumbnailUrl: thumb,
                                            format: ext,
                                            hasAudio: isItemVid,
                                            sourceType: isItemVid ? 'ORIGINAL_VIDEO' : 'ORIGINAL_IMAGE',
                                        });

                                        formats.push({
                                            id: `ig-slide-${idx + 1}`,
                                            label: `Slide ${slideNum} (${ext.toUpperCase()} ${isItemVid ? 'Video' : 'Photo'})`,
                                            format: ext,
                                            quality: 'Original Resolution',
                                            downloadUrl: `/api/download?url=${encodeURIComponent(itemUrl)}&filename=${encodeURIComponent(dlFilename)}`,
                                            category: isItemVid ? 'video' : 'image',
                                            hasAudio: isItemVid,
                                        });
                                    }

                                    if (gallery.length > 0) {
                                        return {
                                            id: `instagram-${shortcode}`,
                                            originalUrl: url,
                                            canonicalUrl,
                                            platform: 'instagram',
                                            platformName: 'Instagram Carousel',
                                            title,
                                            mediaType: 'gallery',
                                            thumbnailUrl: gallery[0].thumbnailUrl || gallery[0].url,
                                            formats,
                                            gallery,
                                            officialViewUrl: canonicalUrl,
                                            fetchedAt: new Date().toISOString(),
                                        };
                                    }
                                }

                                const mediaUrl = data.media || data.download_url || data.url;
                                const thumbnail = data.thumbnail || data.display_url || mediaUrl;
                                const isVid = Boolean(data.is_video || (mediaUrl && mediaUrl.includes('.mp4')) || isReel);
                                const title = decodeHtmlEntities(data.title || `Instagram ${isVid ? 'Reel' : 'Post'} (${shortcode})`);
                                const cleanTitle = sanitizeFilename(title.substring(0, 50), `Instagram_${shortcode}`);

                        if (mediaUrl) {
                            return {
                                id: `instagram-${shortcode}`,
                                originalUrl: url,
                                canonicalUrl,
                                platform: 'instagram',
                                platformName: isVid ? 'Instagram Reel' : 'Instagram',
                                title,
                                mediaType: isVid ? 'video' : 'image',
                                thumbnailUrl: thumbnail,
                                formats: [
                                    {
                                        id: 'ig-rapid-media',
                                        label: isVid ? 'Reel / Video (HD MP4)' : 'Original High-Res Photo (JPG)',
                                        format: isVid ? 'mp4' : 'jpg',
                                        quality: 'Original Resolution',
                                        downloadUrl: `/api/download?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(`${cleanTitle}.${isVid ? 'mp4' : 'jpg'}`)}`,
                                        hasAudio: isVid,
                                        category: isVid ? 'video' : 'image',
                                    },
                                ],
                                officialViewUrl: canonicalUrl,
                                fetchedAt: new Date().toISOString(),
                            };
                        }
                    }
                } catch {
                    // Fallback to other providers
                }
            }

            // 3. Custom External Extraction Service (if INSTAGRAM_API_URL is configured)
            const customApiUrl = process.env.INSTAGRAM_API_URL?.trim();
            if (customApiUrl) {
                try {
                    const customRes = await fetch(`${customApiUrl}?url=${encodeURIComponent(canonicalUrl)}`, {
                        headers: process.env.INSTAGRAM_API_KEY
                            ? { 'Authorization': `Bearer ${process.env.INSTAGRAM_API_KEY}` }
                            : {},
                        signal: AbortSignal.timeout(8000),
                    });

                                if(customRes.ok) {
                                    const customData = await customRes.json();
                        if (customData.url || customData.mediaUrl) {
                            const mediaUrl = customData.url || customData.mediaUrl;
                            const isVid = Boolean(customData.isVideo || mediaUrl.includes('.mp4') || isReel);
                            const title = decodeHtmlEntities(customData.title || `Instagram ${isVid ? 'Reel' : 'Post'}`);
                            const cleanTitle = sanitizeFilename(title.substring(0, 50), `Instagram_${shortcode}`);

                            return {
                                id: `instagram-${shortcode}`,
                                originalUrl: url,
                                canonicalUrl,
                                platform: 'instagram',
                                platformName: isVid ? 'Instagram Reel' : 'Instagram',
                                title,
                                mediaType: isVid ? 'video' : 'image',
                                thumbnailUrl: customData.thumbnailUrl || mediaUrl,
                                formats: [
                                    {
                                        id: 'ig-custom-media',
                                        label: isVid ? 'HD Video (MP4)' : 'High-Res Photo (JPG)',
                                        format: isVid ? 'mp4' : 'jpg',
                                        quality: 'Original Resolution',
                                        downloadUrl: `/api/download?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(`${cleanTitle}.${isVid ? 'mp4' : 'jpg'}`)}`,
                                        hasAudio: isVid,
                                        category: isVid ? 'video' : 'image',
                                    },
                                ],
                                officialViewUrl: canonicalUrl,
                                fetchedAt: new Date().toISOString(),
                            };
                        }
                    }
      } catch {
                    // Fallback
                }
            }

            // 4. Meta Official Graph API / oEmbed (if INSTAGRAM_ACCESS_TOKEN or META_ACCESS_TOKEN is configured)
            const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || process.env.META_ACCESS_TOKEN?.trim();
            if (accessToken) {
                try {
                    const oembedUrl = `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(canonicalUrl)}&access_token=${encodeURIComponent(accessToken)}`;
                    const oembedRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(6000) });
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
                        // Fallback
                    }
                }

                // 5. Public social crawler metadata inspection (facebookexternalhit)
                try {
                    const socialRes = await fetch(canonicalUrl, {
                        headers: {
                            'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
                            'Accept': 'text/html,application/xhtml+xml',
                        },
                        signal: AbortSignal.timeout(7000),
                    });

                    if (socialRes.ok) {
                        const html = await socialRes.text();

                            // Check for carousel / multi-media in HTML
                            const htmlGallery: GalleryItem[] = [];
                            const sidecarMatch = html.match(/"edge_sidecar_to_children":\s*\{\s*"edges":\s*(\[[^\]]+\])/);
                            if (sidecarMatch && sidecarMatch[1]) {
                                try {
                                    const edges = JSON.parse(sidecarMatch[1]);
                                    if (Array.isArray(edges) && edges.length > 1) {
                                        for (let idx = 0; idx < edges.length; idx++) {
                                            const node = edges[idx]?.node;
                                            if (!node) continue;
                                            const itemIsVid = Boolean(node.is_video || node.__typename === 'GraphVideo');
                                            const itemUrl = itemIsVid ? (node.video_url || node.display_url) : node.display_url;
                                            if (!itemUrl) continue;
                                            const ext = itemIsVid ? 'mp4' : 'jpg';
                                            const slideNum = String(idx + 1).padStart(2, '0');
                                            const dlFilename = `OmniFetch_Slide_${slideNum}.${ext}`;
                                            const res = node.dimensions?.width && node.dimensions?.height ? `${node.dimensions.width} × ${node.dimensions.height}` : undefined;
                                            htmlGallery.push({
                                                id: `ig-sidecar-${idx + 1}`,
                                                position: idx + 1,
                                                type: itemIsVid ? 'video' : 'image',
                                                url: unescapeMetaUrl(itemUrl),
                                                downloadUrl: `/api/download?url=${encodeURIComponent(unescapeMetaUrl(itemUrl))}&filename=${encodeURIComponent(dlFilename)}`,
                                                thumbnailUrl: unescapeMetaUrl(node.display_url || itemUrl),
                                                resolution: res,
                                                format: ext,
                                                hasAudio: itemIsVid,
                                            });
                                        }
                                    }
                                } catch {
                                    // Ignore parse errors
                                }
                            }

                            if (htmlGallery.length > 1) {
                                const cleanTitle = sanitizeFilename(`Instagram_${shortcode}`, 'Instagram_Carousel');
                                const formats: MediaFormatOption[] = htmlGallery.map((item) => {
                                    const slideNum = String(item.position).padStart(2, '0');
                                    return {
                                        id: `ig-slide-${item.position}`,
                                        label: `Slide ${slideNum} (${item.format.toUpperCase()} ${item.type === 'video' ? 'Video' : 'Photo'})`,
                                        format: item.format,
                                        quality: item.resolution || 'Original Resolution',
                                        downloadUrl: item.downloadUrl,
                                        category: item.type,
                                        hasAudio: item.hasAudio,
                                    };
                                });

                                return {
                                    id: `instagram-${shortcode}`,
                                    originalUrl: url,
                                    canonicalUrl,
                                    platform: 'instagram',
                                    platformName: 'Instagram Carousel',
                                    title: `Instagram Carousel (${shortcode})`,
                                    mediaType: 'gallery',
                                    thumbnailUrl: htmlGallery[0].thumbnailUrl || htmlGallery[0].url,
                                    formats,
                                    gallery: htmlGallery,
                                    complianceNotice: 'Downloads of public Instagram media are subject to creator rights and platform policies.',
                                    officialViewUrl: canonicalUrl,
                                    fetchedAt: new Date().toISOString(),
                                };
                            }

                            // Extract video_versions if available
                            let videoUrl = '';
                            const vidMatch = html.match(/"video_versions":\s*(\[[^\]]+\])/);
                            if (vidMatch && vidMatch[1]) {
                                try {
                                    const versions = JSON.parse(vidMatch[1]);
                                    if (Array.isArray(versions) && versions.length > 0) {
                                        videoUrl = unescapeMetaUrl(versions[0].url);
                                    }
                                } catch {
                                    // Ignore
                                }
                            }

                            // Extract og:video or direct mp4
                            if (!videoUrl) {
                                const ogVidMatch = html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+)["']/i);
                                if (ogVidMatch && ogVidMatch[1]) videoUrl = unescapeMetaUrl(ogVidMatch[1]);
                            }

                            // Extract og:image
                            let ogImage = '';
                            const ogImgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
                            if (ogImgMatch && ogImgMatch[1]) ogImage = unescapeMetaUrl(ogImgMatch[1]);

                            if (videoUrl || ogImage) {
                                const isVid = Boolean(videoUrl || isReel);
                                const cleanTitle = sanitizeFilename(`Instagram_${shortcode}`, 'Instagram_Media');
                                const formats: MediaFormatOption[] = [];

                                if (videoUrl) {
                                    formats.push({
                                        id: 'ig-video-hd',
                                        label: 'Instagram Video (HD MP4)',
                                        format: 'mp4',
                                        quality: 'High Definition',
                                        downloadUrl: `/api/download?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(`${cleanTitle}.mp4`)}`,
                                        hasAudio: true,
                                        category: 'video',
                                    });
                                }

                                if (ogImage) {
                                    formats.push({
                                        id: 'ig-image-hq',
                                        label: isVid ? 'Cover Poster (JPG)' : 'High Resolution Photo (JPG)',
                                        format: 'jpg',
                                        quality: 'Original Quality',
                                        downloadUrl: `/api/download?url=${encodeURIComponent(ogImage)}&filename=${encodeURIComponent(`${cleanTitle}.jpg`)}`,
                                        category: isVid ? 'thumbnail' : 'image',
                                    });
                                }

                                return {
                                    id: `instagram-${shortcode}`,
                                    originalUrl: url,
                                    canonicalUrl,
                                    platform: 'instagram',
                                    platformName: isVid ? 'Instagram Reel' : 'Instagram',
                                    title: `Instagram ${isVid ? 'Reel' : 'Post'} (${shortcode})`,
                                    mediaType: isVid ? 'video' : 'image',
                                    thumbnailUrl: ogImage || videoUrl,
                                    formats,
                                    complianceNotice: 'Downloads of public Instagram media are subject to creator rights and platform policies.',
                                    officialViewUrl: canonicalUrl,
                                    fetchedAt: new Date().toISOString(),
                                };
                            }
                        }
                    } catch {
                        // Fall through to error reporting
                    }

                    // 6. Gated authentication requirement
                    throw new ExtractionError(
                        'AUTHENTICATION_REQUIRED',
                        'Instagram requires authentication or API credentials to access this post. To enable Instagram extraction, configure INSTAGRAM_ACCESS_TOKEN or RAPIDAPI_KEY in environment variables. Direct media URLs (cdninstagram.com, fbcdn.net) are supported without credentials.',
                        { officialUrl: canonicalUrl }
                    );
                }
}
