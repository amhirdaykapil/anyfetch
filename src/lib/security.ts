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

  // Strip invalid characters, control characters, quotes, slashes, null bytes
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

