import { NextRequest, NextResponse } from 'next/server';
import { validateUrlSecurity } from '@/lib/security';
import { analyzeRateLimiter } from '@/lib/rate-limiter';
import { extractMedia, ExtractionError } from '@/services/platforms';
import { AnalyzeResponse } from '@/types/media';

export async function POST(req: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
    // Extract client IP for rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimit = analyzeRateLimiter.check(ip);

    if (!rateLimit.allowed) {
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'RATE_LIMITED',
                    message: `Too many requests from this address. Please wait ${rateLimit.resetInSec} seconds before analyzing another link.`,
                },
            },
            { status: 429 }
        );
    }

    let body: { url?: string } = {};
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'INVALID_URL',
                    message: 'Malformed request payload. JSON with a valid "url" field is required.',
                },
            },
            { status: 400 }
        );
    }

    const rawUrl = body.url?.trim();
    if (!rawUrl) {
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'INVALID_URL',
                    message: 'Please paste a valid media URL.',
                },
            },
            { status: 400 }
        );
    }

    // SSRF and protocol check
    const security = await validateUrlSecurity(rawUrl);
    if (!security.isSafe) {
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'SSRF_VIOLATION',
                    message: 'Access to this host or address is prohibited by security policy.',
                    details: security.reason,
                },
            },
            { status: 400 }
        );
    }

    try {
        const data = await extractMedia(rawUrl);
        return NextResponse.json({
            success: true,
            data,
        });
    } catch (err) {
        if (err instanceof ExtractionError) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: err.code,
                        message: err.message,
                        details: err.details,
                        officialUrl: err.officialUrl,
                    },
                },
                { status: 422 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'FETCH_FAILED',
                    message: 'An unexpected error occurred while analyzing this link. Please try again or verify the URL is public.',
                    details: (err as Error).message,
                },
            },
            { status: 500 }
        );
    }
}
