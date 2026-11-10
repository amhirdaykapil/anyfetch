'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { getPlatformIcon } from '@/components/PlatformIcons';
import { PLATFORMS_META } from '@/features/platform-detection/detector';
import { PlatformId } from '@/types/media';
import { Check, Shield, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function SupportedPlatformsPage() {
    const platforms: {
        id: PlatformId;
        features: string[];
        restrictions: string[];
        sampleUrl: string;
        status: 'Active' | 'Compliant';
    }[] = [
            {
                id: 'youtube',
                features: ['Public videos & Shorts', '1080p, 720p, 480p streams', 'Ultra HD Thumbnails (1920x1080)', 'Extracted Audio tracks'],
                restrictions: ['Age-gated & private videos require official platform viewing', 'DRM-protected Movies / Content ID protected audio'],
                sampleUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
                status: 'Active',
            },
            {
                id: 'reddit',
                features: ['Native video with audio tracks', 'Multi-image gallery carousels', 'High-res image posts (i.redd.it)', 'GIF playback & downloads'],
                restrictions: ['Private subreddit content requires member login', 'Quarantined/banned posts'],
                sampleUrl: 'https://www.reddit.com/r/pics/comments/92dd8/test_post_please_ignore/',
                status: 'Active',
            },
            {
                id: 'pinterest',
                features: ['Pristine original resolution photography', 'MP4 video pins', 'Short URL expansion (pin.it)', 'Rich metadata extraction'],
                restrictions: ['Secret boards are inaccessible without credentials'],
                sampleUrl: 'https://www.pinterest.com',
                status: 'Active',
            },
            {
                id: 'twitter',
                features: ['Public video clips with bitrate selection (1080p/720p/480p)', 'Maximum resolution photo attachments (?name=orig)', 'Multi-photo sets', 'Animated GIFs'],
                restrictions: ['Protected accounts (@locked) are strictly excluded', 'Deleted tweets'],
                sampleUrl: 'https://x.com',
                status: 'Active',
            },
            {
                id: 'tiktok',
                features: ['Public HD video posts', 'Original master cover photos', 'Official oEmbed captions & authors', 'Fast CDN streaming'],
                restrictions: ['Private accounts and region-restricted videos'],
                sampleUrl: 'https://www.tiktok.com',
                status: 'Active',
            },
            {
                id: 'instagram',
                features: ['Public Reels and video clips', 'High-resolution feed images', 'Cover art extraction', 'Clean metadata preview'],
                restrictions: ['Private account posts are never bypassed', 'Stories and expired ephemeral media'],
                sampleUrl: 'https://www.instagram.com',
                status: 'Active',
            },
            {
                id: 'threads',
                features: ['Public video attachments', 'High-resolution image uploads', 'oEmbed post preview', 'Direct CDN download links'],
                restrictions: ['Private Threads profiles require authorization'],
                sampleUrl: 'https://www.threads.net',
                status: 'Active',
            },
            {
                id: 'facebook',
                features: ['Public Facebook Watch clips', 'HD and SD video streaming', 'High-resolution photo posts'],
                restrictions: ['Private group videos, friend-only posts, and restricted live streams'],
                sampleUrl: 'https://www.facebook.com',
                status: 'Active',
            },
            {
                id: 'direct',
                features: ['Direct MP4, WebM, MOV, MKV video files', 'High-res JPG, PNG, WebP, GIF, SVG images', 'MP3, WAV, M4A, FLAC audio files', 'PDF documents'],
                restrictions: ['URLs pointing to internal IP addresses or private networks are blocked by SSRF filter', 'Files over 500MB require chunked client fetch'],
                sampleUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
                status: 'Active',
            },
        ];

    return (
        <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 transition-colors duration-200 dark:bg-[#09090b] dark:text-zinc-100">
            <Navbar />

            <main className="flex-1 py-16 sm:py-20">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    {/* Header */}
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/60 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-white/[0.08] dark:bg-zinc-900/60 dark:text-zinc-400">
                            <Shield className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Platform Compatibility Directory</span>
                        </div>

                        <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
                            Supported Platforms & Formats
                        </h1>
                        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
                            AnyFetch operates using compliant extraction methods, official oEmbed interfaces, and authorized public endpoints. Below is our capability and limitations matrix across every platform.
                        </p>
                    </div>

                    {/* Compliance Notice */}
                    <div className="mt-8 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-zinc-950/60">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                                <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                                    Compliance Commitment:
                                </span>{' '}
                                AnyFetch never circumvents DRM, password barriers, paywalls, or private account privacy settings. If an item is restricted or deleted, our system displays a transparent explanation and offers the official platform link for viewing.
                            </div>
                        </div>
                    </div>

                    {/* Platform Cards Grid */}
                    <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {platforms.map((p) => {
                            const meta = PLATFORMS_META[p.id];
                            return (
                                <div
                                    key={p.id}
                                    className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 dark:border-white/[0.06] dark:bg-zinc-950/60 dark:hover:border-white/[0.12]"
                                >
                                    <div>
                                        {/* Header */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                                                    {getPlatformIcon(p.id, { size: 20 })}
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                        {meta.name}
                                                    </h3>
                                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                                                        {p.id} adapter
                                                    </span>
                                                </div>
                                            </div>

                                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                {p.status}
                                            </span>
                                        </div>

                                        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                            {meta.description}
                                        </p>

                                        {/* Features list */}
                                        <div className="mt-4">
                                            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                                Supported Capabilities
                                            </h4>
                                            <ul className="mt-2 space-y-1.5">
                                                {p.features.map((feat, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                                                        <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                                        <span>{feat}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Restrictions */}
                                        <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-900">
                                            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                                Limitations
                                            </h4>
                                            <ul className="mt-1.5 space-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                                {p.restrictions.map((res, i) => (
                                                    <li key={i} className="flex items-start gap-1.5">
                                                        <span className="text-zinc-400 dark:text-zinc-600">•</span>
                                                        <span>{res}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Footer Action */}
                                    <div className="mt-6 border-t border-zinc-100 pt-4 dark:border-white/[0.06]">
                                        <Link
                                            href="/"
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
                                        >
                                            <span>Try downloading from {meta.name}</span>
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
