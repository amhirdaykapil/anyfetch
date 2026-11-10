import { MediaFormatOption, MediaResult, MediaType } from '@/types/media';
import { ExtractionError, PlatformAdapter } from './base';
import { sanitizeFilename } from '@/lib/security';
import { decodeHtmlEntities } from '@/lib/html-entities';

function extractHtmlMetaTags(html: string): Record<string, string> {
    const metaRegex = /<meta\s+([^>]+)>/gi;
    const metas: Record<string, string> = {};
    let match: RegExpExecArray | null;

    while ((match = metaRegex.exec(html)) !== null) {
        const attrsStr = match[1];
        const keyMatch = attrsStr.match(/(?:property|name)=["']([^"']+)["']/i);
        const contentMatch = attrsStr.match(/content=["']([^"']+)["']/i);
        if (keyMatch && contentMatch) {
            metas[keyMatch[1].toLowerCase()] = decodeHtmlEntities(contentMatch[1]);
        }
    }
    return metas;
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
        let title = 'Threads Post';
        let authorName = 'Threads User';
        let authorUrl = '';
        let ogImage = '';
        let ogVideo = '';

            // Step 1: Query Threads public oEmbed
            try {
                const oembedRes = await fetch(
                    `https://www.threads.net/oembed?url=${encodeURIComponent(url)}`,
                    {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OmniFetch/2.0' },
                        signal: AbortSignal.timeout(6000),
                    }
                );
                if (oembedRes.ok) {
                    const data = await oembedRes.json();
                    if (data.title) title = decodeHtmlEntities(data.title);
                    if (data.author_name) authorName = decodeHtmlEntities(data.author_name);
                    if (data.author_url) authorUrl = data.author_url;
                }
            } catch {
                // Ignore
            }

                // Step 2: Fetch public HTML
                try {
                    const htmlRes = await fetch(url, {
                        headers: {
                            'User-Agent':
                                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml',
                        },
                        signal: AbortSignal.timeout(7000),
                    });

                        if (htmlRes.ok) {
                            const html = await htmlRes.text();
                            const metas = extractHtmlMetaTags(html);

                            if (metas['og:image']) ogImage = metas['og:image'];
                            else if (metas['twitter:image']) ogImage = metas['twitter:image'];

                        if (metas['og:video'] || metas['og:video:url']) {
                            ogVideo = metas['og:video'] || metas['og:video:url'];
                        }

                            if (metas['og:title']) {
                                title = metas['og:title'];
                            } else if (metas['og:description']) {
                                title = metas['og:description'];
                            }
                        }
                    } catch (err) {
                        if (!ogImage && !ogVideo) {
                            throw new ExtractionError('FETCH_FAILED', 'Failed to inspect Threads post.', {
                                details: (err as Error).message,
                                officialUrl: url,
                            });
                        }
                    }

                    if (!ogImage && !ogVideo) {
                        throw new ExtractionError(
                            'NO_MEDIA_FOUND',
                            'This Threads post does not contain downloadable images or videos, or requires authentication to view.',
                            { officialUrl: url }
                        );
                    }

                    const cleanTitle = sanitizeFilename(title.substring(0, 50), 'Threads_Media');
                    const formats: MediaFormatOption[] = [];
                    const thumbnails: MediaFormatOption[] = [];
                    const isVideo = Boolean(ogVideo);

                    if (ogVideo) {
                        formats.push({
                            id: 'threads-video-hd',
                            label: 'Threads Video (MP4)',
                            format: 'mp4',
                            quality: 'High Definition',
                            downloadUrl: `/api/download?url=${encodeURIComponent(ogVideo)}&filename=${encodeURIComponent(`${cleanTitle}.mp4`)}`,
                            hasAudio: true,
                            category: 'video',
                        });
                    }

                    if (ogImage) {
                        if (isVideo) {
                            thumbnails.push({
                                id: 'threads-image-poster',
                                label: 'Cover Poster (JPG)',
                                format: 'jpg',
                                quality: 'Original Resolution',
                                downloadUrl: `/api/download?url=${encodeURIComponent(ogImage)}&filename=${encodeURIComponent(`${cleanTitle}_poster.jpg`)}`,
                                category: 'thumbnail',
                            });
                        } else {
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

                    return {
                        id: `threads-${Buffer.from(url).toString('base64url').substring(0, 16)}`,
                        originalUrl: url,
                        canonicalUrl: url,
                        platform: 'threads',
                        platformName: isVideo ? 'Threads Video' : 'Threads',
                        title,
                        author: {
                            name: authorName,
                            profileUrl: authorUrl || undefined,
                        },
                        mediaType: isVideo ? 'video' : 'image',
                        thumbnailUrl: ogImage || ogVideo,
                        formats,
                        thumbnails: thumbnails.length > 0 ? thumbnails : undefined,
                        complianceNotice:
                            'Downloads of public Threads media are subject to creator permissions and Meta Platform Terms.',
                        officialViewUrl: url,
                        fetchedAt: new Date().toISOString(),
                    };
                }
}
