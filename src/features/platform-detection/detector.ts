import { PlatformId } from '@/types/media';

export interface PlatformMetadata {
    id: PlatformId;
    name: string;
    domainPattern: RegExp;
    badgeColor: string;
    accentColor: string;
    supportedFormats: string[];
    description: string;
}

export const PLATFORMS_META: Record<PlatformId, PlatformMetadata> = {
    youtube: {
        id: 'youtube',
        name: 'YouTube',
        domainPattern: /(youtube\.com|youtu\.be)/i,
        badgeColor: 'bg-red-500/10 text-red-500 border-red-500/20',
        accentColor: '#ef4444',
        supportedFormats: ['MP4 (1080p, 720p)', 'Thumbnails (1080p)', 'M4A / MP3 Audio'],
        description: 'Public videos, Shorts, max-resolution thumbnails, and audio tracks.',
    },
    instagram: {
        id: 'instagram',
        name: 'Instagram',
        domainPattern: /instagram\.com/i,
        badgeColor: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
        accentColor: '#ec4899',
        supportedFormats: ['MP4 Reels', 'High-Res Photos (JPG)'],
        description: 'Public Reels, feed photos, and high-resolution cover posters.',
    },
    pinterest: {
        id: 'pinterest',
        name: 'Pinterest',
        domainPattern: /(pinterest\.com|pin\.it)/i,
        badgeColor: 'bg-rose-600/10 text-rose-500 border-rose-500/20',
        accentColor: '#e11d48',
        supportedFormats: ['Original HD Images (JPG, PNG)', 'MP4 Videos'],
        description: 'Pristine original resolution photography and video pins.',
    },
    twitter: {
        id: 'twitter',
        name: 'X (Twitter)',
        domainPattern: /(twitter\.com|x\.com)/i,
        badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
        accentColor: '#38bdf8',
        supportedFormats: ['1080p / 720p MP4', 'Original High-Res JPG/PNG'],
        description: 'Public video posts, multiple image sets, and GIFs.',
    },
    tiktok: {
        id: 'tiktok',
        name: 'TikTok',
        domainPattern: /(tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/i,
        badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        accentColor: '#06b6d4',
        supportedFormats: ['HD MP4 Videos', 'Original Cover Images'],
        description: 'Public short videos and master-resolution cover images.',
    },
    reddit: {
        id: 'reddit',
        name: 'Reddit',
        domainPattern: /(reddit\.com|redd\.it)/i,
        badgeColor: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        accentColor: '#f97316',
        supportedFormats: ['720p/1080p MP4', 'Image Galleries', 'Audio M4A', 'GIFs'],
        description: 'Public videos with audio tracks, image carousels, and GIFs.',
    },
    threads: {
        id: 'threads',
        name: 'Threads',
        domainPattern: /threads\.(net|com)/i,
        badgeColor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
        accentColor: '#8b5cf6',
        supportedFormats: ['HD MP4 Videos', 'High-Res Photos'],
        description: 'Public posts, video clips, and high-resolution media attachments.',
    },
    facebook: {
        id: 'facebook',
        name: 'Facebook',
        domainPattern: /(facebook\.com|fb\.watch|fb\.me)/i,
        badgeColor: 'bg-blue-600/10 text-blue-500 border-blue-500/20',
        accentColor: '#2563eb',
        supportedFormats: ['HD / SD MP4 Videos', 'Original Photos'],
        description: 'Public videos, Watch clips, and photography.',
    },
    direct: {
        id: 'direct',
        name: 'Direct Media',
        domainPattern: /\.(mp4|webm|mov|mkv|mp3|wav|m4a|jpg|jpeg|png|gif|webp|pdf)(\?.*)?$/i,
        badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        accentColor: '#10b981',
        supportedFormats: ['MP4', 'WebM', 'MP3', 'WAV', 'JPG', 'PNG', 'WebP', 'GIF', 'PDF'],
        description: 'Direct video, audio, image, and document web links.',
    },
    unknown: {
        id: 'unknown',
        name: 'Universal URL',
        domainPattern: /.+/,
        badgeColor: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
        accentColor: '#a1a1aa',
        supportedFormats: ['Auto-Detected'],
        description: 'Paste any public link to automatically identify media formats.',
    },
};

export function detectLivePlatform(url: string): PlatformMetadata {
    const trimmed = url.trim();
    if (!trimmed) return PLATFORMS_META.unknown;

    for (const key of Object.keys(PLATFORMS_META) as PlatformId[]) {
        if (key === 'unknown') continue;
        const meta = PLATFORMS_META[key];
        if (meta.domainPattern.test(trimmed)) {
            return meta;
        }
    }

    return PLATFORMS_META.unknown;
}
