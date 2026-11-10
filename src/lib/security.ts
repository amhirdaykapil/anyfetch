import dns from 'dns/promises';

// List of disallowed hostnames
const DISALLOWED_HOSTNAMES = new Set([
    'localhost',
    '127.0.0.1',
    '::1',
    '0.0.0.0',
    'metadata.google.internal',
    'instance-data',
]);

/**
 * Checks whether an IPv4 address falls into private/reserved/loopback blocks
 */
function isPrivateIPv4(ip: string): boolean {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some(isNaN)) return true;

    const [a, b] = parts;

    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 10.0.0.0/8 (Private)
    if (a === 10) return true;
    // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16 (Link-local & AWS metadata)
    if (a === 169 && b === 254) return true;
    // 0.0.0.0/8
    if (a === 0) return true;
    // 224.0.0.0/4 (Multicast)
    if (a >= 224) return true;

    return false;
}

/**
 * Checks whether an IPv6 address is local/private/link-local
 */
function isPrivateIPv6(ip: string): boolean {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::' || lower.startsWith('fe80:') || lower.startsWith('fc00:') || lower.startsWith('fd00:')) {
        return true;
    }
    return false;
}

export interface SecurityCheckResult {
    isSafe: boolean;
    reason?: string;
    resolvedIp?: string;
}

/**
 * Validates a target URL against SSRF and protocol exploits
 */
export async function validateUrlSecurity(urlString: string): Promise<SecurityCheckResult> {
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(urlString);
    } catch {
        return { isSafe: false, reason: 'Invalid URL format' };
    }

    // Only permit HTTP and HTTPS
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return { isSafe: false, reason: `Disallowed protocol scheme: ${parsedUrl.protocol}` };
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // Check static disallowed hostnames
    if (DISALLOWED_HOSTNAMES.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
        return { isSafe: false, reason: 'Access to local/internal network hosts is prohibited' };
    }

    // Check if hostname is directly an IP literal
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        if (isPrivateIPv4(hostname)) {
            return { isSafe: false, reason: 'Direct private IPv4 addresses are disallowed' };
        }
    }

    // Perform DNS resolution check to prevent DNS rebinding
    try {
        const lookup = await dns.lookup(hostname, { all: true });
        for (const record of lookup) {
            if (record.family === 4 && isPrivateIPv4(record.address)) {
                return { isSafe: false, reason: `Host resolves to private IP (${record.address})` };
            }
            if (record.family === 6 && isPrivateIPv6(record.address)) {
                return { isSafe: false, reason: `Host resolves to private IPv6 (${record.address})` };
            }
        }
    } catch (err) {
        // If DNS fails to resolve completely, reject
        return { isSafe: false, reason: `Failed to resolve host ${hostname}` };
    }

    return { isSafe: true };
}

/**
 * Sanitizes a filename for Content-Disposition header safely
 */
export function sanitizeFilename(name: string, fallback = 'download'): string {
    if (!name || typeof name !== 'string') return fallback;

    // Strip invalid file system characters, control characters, quotes, slashes, null bytes
    let clean = name
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/\s+/g, '_')
        .trim();

    // If filename starts with dots or empty, fallback
    clean = clean.replace(/^\.+/, '');
    if (!clean) clean = fallback;

    // Limit length
    if (clean.length > 80) {
        clean = clean.substring(0, 80);
    }

    return clean;
}

/**
 * Constructs an RFC 6266 and RFC 5987 compliant Content-Disposition header.
 * 
 * Guarantees that the header string contains ONLY ASCII characters (<= 127),
 * preventing Web API ByteString TypeErrors when titles contain emojis or Unicode.
 * 
 * Format: attachment; filename="<ascii_fallback>"; filename*=UTF-8''<encoded_unicode>
 */
export function buildContentDisposition(filename: string, fallback = 'download.bin'): string {
    if (!filename || typeof filename !== 'string') {
        filename = fallback;
    }

    // Extract extension if present (up to 10 chars, alphanumeric)
    const extMatch = filename.match(/\.([a-zA-Z0-9]{1,10})(?:\?.*)?$/);
    const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';

    // 1. Generate strictly ASCII-safe fallback filename
    // Remove extension temporarily for cleaning base name
    const baseName = extMatch ? filename.slice(0, extMatch.index) : filename;

    // Replace all non-ASCII characters (> 127) and unsafe ASCII chars (quotes, slashes, control chars) with '_'
    let asciiBase = baseName
        .replace(/[^\x20-\x7E]/g, '_') // Strip anything outside printable 7-bit ASCII
        .replace(/["\\;:\/<>|?*\x00-\x1F]/g, '_') // Strip quotes, backslashes, semicolons
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .trim();

    if (!asciiBase || !/[a-zA-Z0-9]/.test(asciiBase)) {
        const fallbackBase = fallback.replace(/\.[^/.]+$/, '');
        asciiBase = fallbackBase || 'download';
    }

    // Ensure length within reasonable limits
    if (asciiBase.length > 60) {
        asciiBase = asciiBase.substring(0, 60).replace(/_+$/, '');
    }

    const asciiFilename = `${asciiBase}${ext}`;

    // 2. Generate RFC 5987 percent-encoded UTF-8 filename
    // Clean newlines, quotes, control chars from full unicode filename
    const cleanUtf8 = filename
        .replace(/[\r\n\t\x00-\x1F"\\\/]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();

    // RFC 5987 percent-encode: encodeURIComponent escapes everything except ALPHA, DIGIT, and - _ . ! ~ * ' ( )
    // We also encode ' ( ) * to be strictly compliant with attr-char specs
    const encodedUtf8 = encodeURIComponent(cleanUtf8)
        .replace(/['()]/g, escape)
        .replace(/\*/g, '%2A');

    // 3. Assemble header string
    const headerValue = `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedUtf8}`;

    // Absolute fail-safe: Ensure 0 characters with code point > 127 exist in the header value
    return headerValue.replace(/[^\x20-\x7E]/g, '');
}

