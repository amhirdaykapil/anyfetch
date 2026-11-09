import { MediaFormatOption, MediaResult, MediaType } from '@/types/media';
import { ExtractionError, PlatformAdapter } from './base';
import { sanitizeFilename } from '@/lib/security';

export class PinterestAdapter implements PlatformAdapter {
    public id = 'pinterest' as const;
    public name = 'Pinterest';
    public iconName = 'Pin';

    public canHandle(url: string, parsedUrl?: URL): boolean {
        try {
            const u = parsedUrl || new URL(url);
            const host = u.hostname.toLowerCase();
            return (
                host === 'pinterest.com' ||
                host.endsWith('.pinterest.com') ||
                host === 'pinimg.com' ||
                host.endsWith('.pinimg.com') ||
                host === 'pin.it'
            );
        } catch {
            return false;
        }
    }

    public async extract(url: string): Promise<MediaResult> {
        let targetUrl = url;
        const parsed = new URL(url);

        // Direct pinimg.com media URL
        if (parsed.hostname.includes('pinimg.com')) {
            const originalImageUrl = url.replace(/\/(736x|564x|474x|236x)\//, '/originals/');
            const standardImageUrl = url.replace(/\/(236x|474x|564x)\//, '/736x/');
            const filename = parsed.pathname.split('/').pop() || 'pinterest_image.jpg';
            const cleanTitle = sanitizeFilename(filename.replace(/\.[^/.]+$/, ''), 'Pinterest_Image');
            return {
                id: `pinterest-${cleanTitle}`,
                originalUrl: url,
                canonicalUrl: url,
                platform: 'pinterest',
                platformName: 'Pinterest',
                title: cleanTitle,
                mediaType: 'image',
                thumbnailUrl: standardImageUrl,
                formats: [
                    {
                        id: 'pin-img-orig',
                        label: 'Original Pristine Resolution (JPG)',
                        format: 'jpg',
                        quality: 'Original Resolution',
                        downloadUrl: `/api/download?url=${encodeURIComponent(originalImageUrl)}&filename=${encodeURIComponent(`${cleanTitle}_original.jpg`)}`,
                        category: 'image',
                    },
                    {
                        id: 'pin-img-standard',
                        label: 'Standard Quality (736p JPG)',
                        format: 'jpg',
                        quality: 'Standard 736p',
                        downloadUrl: `/api/download?url=${encodeURIComponent(standardImageUrl)}&filename=${encodeURIComponent(`${cleanTitle}.jpg`)}`,
                        category: 'image',
                    },
                ],
                fetchedAt: new Date().toISOString(),
            };
        }

        // Follow redirect for short pin.it URLs
        if (url.includes('pin.it')) {
            try {
                const head = await fetch(url, {
                    method: 'HEAD',
                    redirect: 'follow',
                    signal: AbortSignal.timeout(6000),
                });
                targetUrl = head.url;
            } catch {
                // Fall back to original URL
            }
        }

        let title = 'Pinterest Pin';
        let authorName = 'Pinterest Creator';
        let authorUrl = '';
        let ogImage = '';
        let ogVideo = '';

        // Step 1: Try Pinterest oEmbed
        try {
            const oembedUrl = `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(targetUrl)}`;
            const oembedRes = await fetch(oembedUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OmniFetch/2.0' },
                signal: AbortSignal.timeout(6000),
            });
            if (oembedRes.ok) {
                const oembedData = await oembedRes.json();
                if (oembedData.title) title = oembedData.title;
                if (oembedData.author_name) authorName = oembedData.author_name;
                if (oembedData.author_url) authorUrl = oembedData.author_url;
                if (oembedData.thumbnail_url) ogImage = oembedData.thumbnail_url;
            }
        } catch {
            // Ignore and proceed to HTML parse
        }

        // Step 2: Fetch public HTML to discover original image / video
        try {
            const htmlRes = await fetch(targetUrl, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                signal: AbortSignal.timeout(8000),
            });

            if (htmlRes.ok) {
                const html = await htmlRes.text();

                // Extract og:image
                const imgMatch =
                    html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                    html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i) ||
                    html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i) ||
                    html.match(/https:\/\/i\.pinimg\.com\/(?:originals|736x)\/[a-zA-Z0-9_\/.-]+\.(?:jpg|png|webp)/i);
                if (imgMatch && (imgMatch[1] || imgMatch[0])) {
                    ogImage = imgMatch[1] || imgMatch[0];
                }

                // Fallback to embedded JSON payload in page
                if (!ogImage) {
                    const jsonMatch =
                        html.match(/https:\\\/\\\/i\.pinimg\.com\\\/[^\"]+\.(?:jpg|jpeg|png|webp)/i) ||
                        html.match(/https:\/\/i\.pinimg\.com\/[^\"]+\.(?:jpg|jpeg|png|webp)/i);
                    if (jsonMatch) {
                        ogImage = jsonMatch[0].replace(/\\\//g, '/');
                    }
                }

                // Extract og:video
                const vidMatch =
                    html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+)["']/i) ||
                    html.match(/content=["']([^"']+)["']\s+property=["']og:video["']/i) ||
                    html.match(/"contentUrl":\s*"([^"]+\.mp4[^"]*)"/i);
                if (vidMatch && vidMatch[1]) {
                    ogVideo = vidMatch[1];
                }

                // Extract title
                if (title === 'Pinterest Pin') {
                    const titleMatch =
                        html.match(/"title":\s*"([^"]+)"/i) ||
                        html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                        html.match(/<title>([^<]+)<\/title>/i);
                    if (titleMatch && titleMatch[1]) {
                        title = titleMatch[1].replace(/ - Pinterest$/, '').trim();
                    }
                }
            }
        } catch (err) {
            if (!ogImage) {
                throw new ExtractionError('FETCH_FAILED', 'Failed to inspect Pinterest pin.', {
                    details: (err as Error).message,
                    officialUrl: targetUrl,
                });
            }
        }

        if (!ogImage && !ogVideo) {
            throw new ExtractionError('NO_MEDIA_FOUND', 'Could not locate downloadable media on this Pinterest pin.', {
                officialUrl: targetUrl,
            });
        }

        const cleanTitle = sanitizeFilename(title.substring(0, 50), 'Pinterest_Pin');
        const formats: MediaFormatOption[] = [];
        const thumbnails: MediaFormatOption[] = [];
        let mediaType: MediaType = 'image';

        if (ogVideo) {
            mediaType = 'video';
            formats.push({
                id: 'pin-video-hd',
                label: 'Pinterest Video (MP4)',
                format: 'mp4',
                quality: 'High Definition (MP4)',
                downloadUrl: `/api/download?url=${encodeURIComponent(ogVideo)}&filename=${encodeURIComponent(`${cleanTitle}.mp4`)}`,
                hasAudio: true,
                category: 'video',
            });
        }

        if (ogImage) {
            // Check if original full-res exists
            const originalImageUrl = ogImage.replace(/\/(736x|564x|474x|236x)\//, '/originals/');
            let hasOriginal = false;
            try {
                const head = await fetch(originalImageUrl, {
                    method: 'HEAD',
                    headers: { 'Referer': 'https://www.pinterest.com/', 'User-Agent': 'Mozilla/5.0' },
                    signal: AbortSignal.timeout(3000),
                });
                if (head.ok) {
                    hasOriginal = true;
                }
            } catch {
                hasOriginal = false;
            }

                const standardImageUrl = ogImage.replace(/\/(236x|474x|564x)\//, '/736x/');

                if (ogVideo) {
                    // If it is a video, save poster/thumbnail into thumbnails array
                    if (hasOriginal) {
                        thumbnails.push({
                            id: 'pin-thumb-orig',
                            label: 'Master Video Poster (Original JPG)',
                            format: 'jpg',
                            quality: 'Original Master',
                            downloadUrl: `/api/download?url=${encodeURIComponent(originalImageUrl)}&filename=${encodeURIComponent(`${cleanTitle}_poster.jpg`)}`,
                            category: 'thumbnail',
                        });
                    }
                    thumbnails.push({
                        id: 'pin-thumb-standard',
                        label: 'Video Thumbnail (736p JPG)',
                        format: 'jpg',
                        quality: '736p Standard',
                        downloadUrl: `/api/download?url=${encodeURIComponent(standardImageUrl)}&filename=${encodeURIComponent(`${cleanTitle}_thumb.jpg`)}`,
                        category: 'thumbnail',
                    });
                } else {
                    // Pure image pin
                    const origExt = (originalImageUrl.match(/\.([a-zA-Z0-9]+)$/) || [])[1]?.toLowerCase() || 'jpg';
                    const stdExt = (standardImageUrl.match(/\.([a-zA-Z0-9]+)$/) || [])[1]?.toLowerCase() || 'jpg';

                    if (hasOriginal) {
                        formats.push({
                            id: 'pin-img-orig',
                            label: `Original Pristine Resolution (${origExt.toUpperCase()})`,
                            format: origExt,
                            quality: 'Original Resolution',
                            downloadUrl: `/api/download?url=${encodeURIComponent(originalImageUrl)}&filename=${encodeURIComponent(`${cleanTitle}_original.${origExt}`)}`,
                            category: 'image',
                        });
                    }
                    formats.push({
                        id: 'pin-img-standard',
                        label: hasOriginal ? `Standard Quality (${stdExt.toUpperCase()})` : `Original Image (${stdExt.toUpperCase()})`,
                        format: stdExt,
                        quality: 'Standard Quality',
                        downloadUrl: `/api/download?url=${encodeURIComponent(standardImageUrl)}&filename=${encodeURIComponent(`${cleanTitle}.${stdExt}`)}`,
                        category: 'image',
                    });
                }
            }

            return {
                id: `pinterest-${Buffer.from(targetUrl).toString('base64url').substring(0, 16)}`,
                originalUrl: url,
                canonicalUrl: targetUrl,
                platform: 'pinterest',
                platformName: 'Pinterest',
                title,
                author: {
                    name: authorName,
                    profileUrl: authorUrl || undefined,
                },
                mediaType,
                thumbnailUrl: ogImage,
                formats,
                thumbnails: thumbnails.length > 0 ? thumbnails : undefined,
                officialViewUrl: targetUrl,
                fetchedAt: new Date().toISOString(),
            };
        }
    }
