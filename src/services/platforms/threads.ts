import { MediaFormatOption, MediaResult, MediaType } from '@/types/media';
import { ExtractionError, PlatformAdapter } from './base';
import { sanitizeFilename } from '@/lib/security';

export class ThreadsAdapter implements PlatformAdapter {
    public id = 'threads' as const;
    public name = 'Threads';
    public iconName = 'AtSign';

    public canHandle(url: string, parsedUrl?: URL): boolean {
        try {
            const u = parsedUrl || new URL(url);
            const host = u.hostname.toLowerCase();
            return host === 'threads.net' || host.endsWith('.threads.net') || host === 'threads.com';
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
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OmniMedia/1.0' },
                    signal: AbortSignal.timeout(6000),
                }
            );
            if (oembedRes.ok) {
                const data = await oembedRes.json();
                if (data.title) title = data.title;
                if (data.author_name) authorName = data.author_name;
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
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                signal: AbortSignal.timeout(7000),
            });

            if (htmlRes.ok) {
                const html = await htmlRes.text();

                const imgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
                if (imgMatch && imgMatch[1]) ogImage = imgMatch[1];

                const vidMatch = html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+)["']/i);
                if (vidMatch && vidMatch[1]) ogVideo = vidMatch[1];

                if (title === 'Threads Post') {
                    const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
                    if (descMatch && descMatch[1]) title = descMatch[1];
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
                'This Threads post does not contain downloadable images or videos.',
                { officialUrl: url }
            );
        }

        const cleanTitle = sanitizeFilename(title.substring(0, 50), 'Threads_Media');
        const formats: MediaFormatOption[] = [];
        const isVideo = Boolean(ogVideo);

        if (ogVideo) {
            formats.push({
                id: 'threads-video-hd',
                label: 'Threads Video (MP4)',
                format: 'mp4',
                quality: 'High Definition',
                downloadUrl: `/api/download?url=${encodeURIComponent(ogVideo)}&filename=${encodeURIComponent(`${cleanTitle}.mp4`)}`,
            });
        }

        if (ogImage) {
            formats.push({
                id: 'threads-image-hd',
                label: isVideo ? 'Cover Poster (JPG)' : 'High Resolution Photo (JPG)',
                format: 'jpg',
                quality: 'Original Resolution',
                downloadUrl: `/api/download?url=${encodeURIComponent(ogImage)}&filename=${encodeURIComponent(`${cleanTitle}.jpg`)}`,
            });
        }

        return {
            id: `threads-${Buffer.from(url).toString('base64url').substring(0, 16)}`,
            originalUrl: url,
            canonicalUrl: url,
            platform: 'threads',
            platformName: 'Threads',
            title,
            author: {
                name: authorName,
                username: `@${authorName}`,
                profileUrl: authorUrl || undefined,
            },
            mediaType: isVideo ? 'video' : 'image',
            thumbnailUrl: ogImage || ogVideo,
            formats,
            officialViewUrl: url,
            fetchedAt: new Date().toISOString(),
        };
    }
}
