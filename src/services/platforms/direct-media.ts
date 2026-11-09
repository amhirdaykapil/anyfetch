import { MediaFormatOption, MediaResult, MediaType } from '@/types/media';
import { ExtractionError, PlatformAdapter } from './base';
import { formatBytes } from '@/lib/utils';
import { getExtensionFromMime, getMimeFromExtension } from '@/lib/mime-types';
import { sanitizeFilename } from '@/lib/security';

const MEDIA_EXTENSIONS = new Set([
    'mp4', 'webm', 'mov', 'mkv', 'avi',
    'mp3', 'wav', 'm4a', 'ogg', 'flac',
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'avif',
    'pdf'
]);

export class DirectMediaAdapter implements PlatformAdapter {
    public id = 'direct' as const;
    public name = 'Direct Media';
    public iconName = 'FileDown';

    public canHandle(url: string, parsedUrl?: URL): boolean {
        try {
            const u = parsedUrl || new URL(url);
            const pathname = u.pathname.toLowerCase();
            const dotIndex = pathname.lastIndexOf('.');
            if (dotIndex !== -1) {
                const ext = pathname.substring(dotIndex + 1);
                if (MEDIA_EXTENSIONS.has(ext)) return true;
            }
        } catch {
            return false;
        }
        return false;
    }

    public async extract(url: string): Promise<MediaResult> {
        const parsedUrl = new URL(url);
        const pathname = parsedUrl.pathname;
        const dotIndex = pathname.lastIndexOf('.');
        let ext = dotIndex !== -1 ? pathname.substring(dotIndex + 1).toLowerCase() : '';

        let contentLength = 0;
        let contentType = '';
        let suggestedFilename = pathname.split('/').filter(Boolean).pop() || 'media_asset';

        try {
            const headRes = await fetch(url, {
                method: 'HEAD',
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                },
                signal: AbortSignal.timeout(6000),
            });

            if (headRes.ok) {
                contentType = headRes.headers.get('content-type') || '';
                const cl = headRes.headers.get('content-length');
                if (cl) contentLength = parseInt(cl, 10);

                const disposition = headRes.headers.get('content-disposition');
                if (disposition && disposition.includes('filename=')) {
                    const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
                    if (match && match[1]) suggestedFilename = match[1];
                }

                if (!ext && contentType) {
                    ext = getExtensionFromMime(contentType);
                }
            }
        } catch {
            // If HEAD request fails, continue with URL extrapolation
        }

        if (!ext || ext === 'bin') {
            if (contentType && (contentType.includes('text/html') || contentType.includes('application/json'))) {
                throw new ExtractionError(
                    'NO_MEDIA_FOUND',
                    'The provided URL points to a standard web page, not a direct media file. Use a link to a supported platform or a direct media file URL.'
                );
            }
            // If extension still missing, try inferring from pathname or fallback to jpg/mp4 if image/video detected
            if (contentType.startsWith('image/')) {
                ext = 'jpg';
            } else if (contentType.startsWith('video/')) {
                ext = 'mp4';
            } else if (contentType.startsWith('audio/')) {
                ext = 'mp3';
            } else {
                throw new ExtractionError(
                    'UNSUPPORTED_PLATFORM',
                    'Could not verify a supported media format at this address.'
                );
            }
        }

        let mediaType: MediaType = 'document';
        if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) {
            mediaType = 'video';
        } else if (['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ext)) {
            mediaType = 'audio';
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'avif'].includes(ext)) {
            mediaType = 'image';
        }

        // Determine clean title from filename
        let rawTitle = decodeURIComponent(suggestedFilename).replace(/\.[^/.]+$/, '');
        if (!rawTitle || rawTitle === 'download' || rawTitle === 'image' || rawTitle === 'media_asset') {
            rawTitle = `${mediaType.toUpperCase()}_Asset`;
        }
        const cleanTitle = sanitizeFilename(rawTitle, 'Media_Asset');
        const finalFilename = `${cleanTitle}.${ext}`;

        const formats: MediaFormatOption[] = [
            {
                id: 'direct-original',
                label: `Original ${ext.toUpperCase()}`,
                format: ext,
                quality: 'Original Master Quality',
                fileSize: contentLength > 0 ? contentLength : undefined,
                fileSizeFormatted: contentLength > 0 ? formatBytes(contentLength) : undefined,
                downloadUrl: `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(finalFilename)}`,
                isDirect: true,
            },
        ];

        const isImage = mediaType === 'image';
        const thumbnailUrl = isImage ? url : '';

        return {
            id: `direct-${Buffer.from(url).toString('base64url').substring(0, 16)}`,
            originalUrl: url,
            canonicalUrl: url,
            platform: 'direct',
            platformName: 'Direct Media',
            title: cleanTitle,
            mediaType,
            thumbnailUrl,
            formats,
            fetchedAt: new Date().toISOString(),
        };
    }
}
