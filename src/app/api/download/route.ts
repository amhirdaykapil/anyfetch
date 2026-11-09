import { NextRequest, NextResponse } from 'next/server';
import { validateUrlSecurity, sanitizeFilename } from '@/lib/security';
import { downloadRateLimiter } from '@/lib/rate-limiter';
import { isAllowedMimeType } from '@/lib/mime-types';

export async function GET(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimit = downloadRateLimiter.check(ip);

    if (!rateLimit.allowed) {
        return new NextResponse(`Rate limit exceeded. Try again in ${rateLimit.resetInSec}s.`, {
            status: 429,
            headers: { 'Content-Type': 'text/plain' },
        });
    }

    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');
    const customFilename = searchParams.get('filename') || 'media_download';

    if (!targetUrl) {
        return new NextResponse('Missing required "url" parameter.', { status: 400 });
    }

    // SSRF check
    const security = await validateUrlSecurity(targetUrl);
    if (!security.isSafe) {
        return new NextResponse(`Access denied: ${security.reason}`, { status: 403 });
    }

    try {
        const upstream = await fetch(targetUrl, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': '*/*',
            },
            signal: AbortSignal.timeout(60000), // 60s timeout for large file streaming
        });

        if (!upstream.ok) {
            return new NextResponse(`Upstream service returned error HTTP ${upstream.status}`, {
                status: upstream.status,
            });
        }

        const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
        const contentLength = upstream.headers.get('content-length');

        // MIME type safety validation
        if (!isAllowedMimeType(contentType)) {
            return new NextResponse('The requested file type is not allowed for security reasons.', {
                status: 415,
            });
        }

        const safeFilename = sanitizeFilename(customFilename, 'download');

        const headers = new Headers();
        headers.set('Content-Disposition', `attachment; filename="${safeFilename}"`);
        headers.set('Content-Type', contentType);
        if (contentLength) {
            headers.set('Content-Length', contentLength);
        }
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

        // Stream upstream body directly
        return new NextResponse(upstream.body as ReadableStream, {
            status: 200,
            headers,
        });
    } catch (err) {
        return new NextResponse(`Download streaming failed: ${(err as Error).message}`, {
            status: 502,
        });
    }
}
