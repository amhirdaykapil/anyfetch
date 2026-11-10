import { NextRequest, NextResponse } from 'next/server';
import { validateUrlSecurity, sanitizeFilename, buildContentDisposition } from '@/lib/security';
import { downloadRateLimiter } from '@/lib/rate-limiter';
import { isAllowedMimeType, getExtensionFromMime, getMimeFromExtension } from '@/lib/mime-types';
import { spawn } from 'child_process';
import { Readable } from 'stream';

const PYTHON_BIN =
    process.env.PYTHON_PATH ||
    'E:\\Users\\itsbe\\AppData\\Local\\Programs\\Python\\Python312\\python.exe';

const FFMPEG_BIN =
    process.env.FFMPEG_PATH ||
    'E:\\Users\\itsbe\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe';

/**
 * Generates appropriate CDN headers (Referer, User-Agent, Origin, Range)
 * to prevent upstream 403 Forbidden hotlink blocks across platforms.
 */
function getUpstreamHeaders(targetUrl: URL, clientRange?: string | null): Record<string, string> {
    const hostname = targetUrl.hostname.toLowerCase();
    const headers: Record<string, string> = {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'video',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
    };

    if (hostname.includes('pinterest.com') || hostname.includes('pinimg.com')) {
        headers['Referer'] = 'https://www.pinterest.com/';
        headers['Origin'] = 'https://www.pinterest.com';
        headers['Sec-Fetch-Dest'] = 'image';
    } else if (hostname.includes('reddit.com') || hostname.includes('redd.it')) {
        headers['Referer'] = 'https://www.reddit.com/';
        headers['Origin'] = 'https://www.reddit.com';
    } else if (
        hostname.includes('instagram.com') ||
        hostname.includes('cdninstagram.com') ||
        hostname.includes('fbcdn.net')
    ) {
        headers['Referer'] = 'https://www.instagram.com/';
        headers['Origin'] = 'https://www.instagram.com';
    } else if (
        hostname.includes('twitter.com') ||
        hostname.includes('twimg.com') ||
        hostname.includes('x.com')
    ) {
        headers['Referer'] = 'https://x.com/';
        headers['Origin'] = 'https://x.com';
    } else if (hostname.includes('tiktok.com') || hostname.includes('tiktokcdn.com')) {
        headers['Referer'] = 'https://www.tiktok.com/';
        headers['Origin'] = 'https://www.tiktok.com';
    } else if (
        hostname.includes('youtube.com') ||
        hostname.includes('ytimg.com') ||
        hostname.includes('googlevideo.com')
    ) {
        headers['Referer'] = 'https://www.youtube.com/';
        headers['Origin'] = 'https://www.youtube.com';
    }

    if (clientRange) {
        headers['Range'] = clientRange;
    }

    return headers;
}

export async function GET(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimit = downloadRateLimiter.check(ip);

    if (!rateLimit.allowed) {
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'RATE_LIMITED',
                    message: `Download rate limit reached. Please wait ${rateLimit.resetInSec} seconds.`,
                },
            },
            { status: 429 }
        );
    }

    const { searchParams } = new URL(req.url);
    const downloadType = searchParams.get('type');

    // Support deterministic testing of live byte tracking and continuous progress
    if (downloadType === 'benchmark_test') {
        const totalSize = parseInt(searchParams.get('size') || '54525952', 10); // default 52 MB
        const chunkSize = 256 * 1024; // 256 KB per chunk
        let bytesSent = 0;

        const stream = new ReadableStream({
            async pull(controller) {
                if (bytesSent >= totalSize) {
                    controller.close();
                    return;
                }
                const remaining = totalSize - bytesSent;
                const thisChunk = Math.min(chunkSize, remaining);
                const chunkData = new Uint8Array(thisChunk);
                chunkData.fill(65);
                controller.enqueue(chunkData);
                bytesSent += thisChunk;
                // Realistic chunk pacing
                await new Promise((r) => setTimeout(r, 12));
            },
        });

        const headers = new Headers();
        headers.set('Content-Disposition', buildContentDisposition('test_52mb_file.bin', 'test_file.bin'));
        headers.set('Content-Type', 'application/octet-stream');
        headers.set('Content-Length', totalSize.toString());
        headers.set('X-Content-Length', totalSize.toString());
        headers.set('X-Total-Bytes', totalSize.toString());
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

        return new NextResponse(stream, { status: 200, headers });
    }

    // Handle YouTube authorized streaming with on-the-fly audio/video multiplexing
    if (downloadType === 'yt_stream') {
        const videoId = searchParams.get('videoId');
        const quality = searchParams.get('quality') || '720';
        const customFilename = searchParams.get('filename') || `youtube_${videoId}.mp4`;
        const expectedSize = searchParams.get('size') || searchParams.get('filesize');

        if (!videoId || !/^[a-zA-Z0-9_-]{6,15}$/.test(videoId)) {
            return NextResponse.json(
                { success: false, error: { code: 'INVALID_URL', message: 'Invalid YouTube video ID parameter.' } },
                { status: 400 }
            );
        }

        const isAudio = quality === 'audio';
        const safeFilename = sanitizeFilename(customFilename, isAudio ? 'audio.mp3' : 'video.mp4');
        const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;

        const args = isAudio
            ? [
                '-m',
                'yt_dlp',
                '--extractor-args',
                'youtube:player_client=android,web',
                '-f',
                'ba/b',
                '-x',
                '--audio-format',
                'mp3',
                '--ffmpeg-location',
                FFMPEG_BIN,
                '-o',
                '-',
                '--no-playlist',
                '--no-warnings',
                targetUrl,
            ]
            : [
                '-m',
                'yt_dlp',
                '--extractor-args',
                'youtube:player_client=android,web',
                '-f',
                `bestvideo[height<=${parseInt(quality, 10) || 720}]+bestaudio/best[height<=${parseInt(quality, 10) || 720}]/best`,
                '--downloader-args',
                'ffmpeg_o:-movflags +frag_keyframe+empty_moov -f mp4',
                '--ffmpeg-location',
                FFMPEG_BIN,
                '-o',
                '-',
                '--no-playlist',
                '--no-warnings',
                targetUrl,
            ];

        try {
            const child = spawn(/*turbopackIgnore: true*/ PYTHON_BIN, args, { stdio: ['ignore', 'pipe', 'ignore'] });
            req.signal.addEventListener('abort', () => {
                child.kill();
            });

            const webStream = Readable.toWeb(child.stdout);
            const headers = new Headers();
            headers.set(
                'Content-Disposition',
                buildContentDisposition(customFilename, isAudio ? 'audio.mp3' : 'video.mp4')
            );
            headers.set('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');
            headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            if (expectedSize && parseInt(expectedSize, 10) > 0) {
                headers.set('X-Total-Bytes', expectedSize);
                headers.set('X-Content-Length', expectedSize);
            }

            return new NextResponse(webStream as ReadableStream, {
                status: 200,
                headers,
            });
        } catch (err) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'STREAM_FAILED',
                        message: `Streaming pipeline failed: ${(err as Error).message}`,
                    },
                },
                { status: 502 }
            );
        }
    }

    const rawTargetUrl = searchParams.get('url');
    const customFilename = searchParams.get('filename') || 'media_download';

    if (!rawTargetUrl) {
        return NextResponse.json(
            { success: false, error: { code: 'INVALID_URL', message: 'Missing required "url" parameter.' } },
            { status: 400 }
        );
    }

    let currentUrl = rawTargetUrl;
    let response: Response | null = null;
    const maxRedirects = 5;

    try {
        // Safe redirect follower with strict SSRF validation at every hop
        for (let hop = 0; hop <= maxRedirects; hop++) {
            let parsedUrl: URL;
            try {
                parsedUrl = new URL(currentUrl);
            } catch {
                return NextResponse.json(
                    { success: false, error: { code: 'INVALID_URL', message: 'Malformed destination URL.' } },
                    { status: 400 }
                );
            }

            // SSRF check on this hop
            const security = await validateUrlSecurity(currentUrl);
            if (!security.isSafe) {
                return NextResponse.json(
                    {
                        success: false,
                        error: {
                            code: 'SSRF_VIOLATION',
                            message: `Security filter blocked access to ${parsedUrl.hostname}: ${security.reason}`,
                        },
                    },
                    { status: 403 }
                );
            }

            const upstreamHeaders = getUpstreamHeaders(parsedUrl, req.headers.get('range'));

            response = await fetch(currentUrl, {
                method: 'GET',
                headers: upstreamHeaders,
                redirect: 'manual',
                signal: AbortSignal.timeout(45000),
            });

            // Handle redirect status codes
            if ([301, 302, 303, 307, 308].includes(response.status)) {
                const location = response.headers.get('location');
                if (!location) {
                    return NextResponse.json(
                        { success: false, error: { code: 'REDIRECT_ERROR', message: 'Redirect missing Location header.' } },
                        { status: 502 }
                    );
                }
                currentUrl = new URL(location, currentUrl).toString();
                continue;
            }

            // Reached final destination
            break;
        }

        if (!response) {
            return NextResponse.json(
                { success: false, error: { code: 'FETCH_FAILED', message: 'No response from upstream host.' } },
                { status: 502 }
            );
        }

        // Check upstream status (support 200 OK and 206 Partial Content)
        if (!response.ok && response.status !== 206) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'UPSTREAM_ERROR',
                        message: `The upstream media host returned error HTTP ${response.status}. The media link may be expired, private, or restricted.`,
                        status: response.status,
                    },
                },
                { status: response.status >= 400 && response.status < 600 ? response.status : 502 }
            );
        }

        // Determine and normalize content type
        let rawContentType = response.headers.get('content-type') || '';
        let cleanContentType = rawContentType.split(';')[0].trim().toLowerCase();

        // Deduce extensions
        let extFromMime = getExtensionFromMime(cleanContentType);
        let extFromFilename = (customFilename.match(/\.([a-zA-Z0-9]+)$/) || [])[1]?.toLowerCase();

        // If upstream returns generic binary or octet-stream, infer from filename extension
        if (
            (!cleanContentType ||
                cleanContentType === 'application/octet-stream' ||
                cleanContentType === 'binary/octet-stream') &&
            extFromFilename
        ) {
            cleanContentType = getMimeFromExtension(extFromFilename);
            extFromMime = extFromFilename;
        }

        // Fallback if still unknown
        if (!cleanContentType) {
            cleanContentType = 'application/octet-stream';
        }

        // Security check: MIME must be allowed media/document
        if (!isAllowedMimeType(cleanContentType)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'UNALLOWED_MIME',
                        message: `The requested file type (${cleanContentType}) is not permitted.`,
                    },
                },
                { status: 415 }
            );
        }

        // Safe filename with guaranteed correct extension
        let safeFilename = sanitizeFilename(customFilename, 'download');
        if (!safeFilename.includes('.') && extFromMime && extFromMime !== 'bin') {
            safeFilename = `${safeFilename}.${extFromMime}`;
        }

        // RFC 6266 / RFC 5987 compliant Content-Disposition with ByteString guarantee
        const contentDisposition = buildContentDisposition(safeFilename, `download.${extFromMime || 'bin'}`);

        const headers = new Headers();
        headers.set('Content-Disposition', contentDisposition);
        headers.set('Content-Type', cleanContentType);
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        headers.set('Accept-Ranges', 'bytes');

        // Only set Content-Length if not compressed by upstream/undici
        const contentLength = response.headers.get('content-length') || searchParams.get('size');
        const contentEncoding = response.headers.get('content-encoding');
            if (contentLength && parseInt(contentLength, 10) > 0) {
                headers.set('X-Content-Length', contentLength);
                headers.set('X-Total-Bytes', contentLength);
                if (!contentEncoding) {
                    headers.set('Content-Length', contentLength);
                }
            }

            const contentRange = response.headers.get('content-range');
            if (contentRange && response.status === 206) {
                headers.set('Content-Range', contentRange);
                return new NextResponse(response.body as ReadableStream, {
                    status: 206,
                    headers,
                });
            }

            return new NextResponse(response.body as ReadableStream, {
                status: 200,
                headers,
            });
        } catch (err) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'STREAM_FAILED',
                        message: `Download stream failed: ${(err as Error).message}`,
                    },
                },
                { status: 502 }
            );
        }
    }
