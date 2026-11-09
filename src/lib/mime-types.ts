export const MIME_EXTENSION_MAP: Record<string, string> = {
  // Video
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
  'video/x-matroska': 'mkv',
  'video/ogg': 'ogv',
  // Audio
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/flac': 'flac',
  // Image
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/avif': 'avif',
  // Document
  'application/pdf': 'pdf',
  'text/plain': 'txt',
};

export const EXTENSION_MIME_MAP: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
};

export function getExtensionFromMime(mimeType?: string): string {
  if (!mimeType) return 'bin';
  const cleanMime = mimeType.split(';')[0].trim().toLowerCase();
  return MIME_EXTENSION_MAP[cleanMime] || 'bin';
}

export function getMimeFromExtension(ext?: string): string {
  if (!ext) return 'application/octet-stream';
  const cleanExt = ext.replace(/^\./, '').toLowerCase();
  return EXTENSION_MIME_MAP[cleanExt] || 'application/octet-stream';
}

export function isAllowedMimeType(mimeType?: string): boolean {
  if (!mimeType) return false;
  const cleanMime = mimeType.split(';')[0].trim().toLowerCase();
  return (
    cleanMime.startsWith('video/') ||
    cleanMime.startsWith('audio/') ||
    cleanMime.startsWith('image/') ||
    cleanMime === 'application/pdf' ||
    cleanMime === 'application/octet-stream'
  );
}

