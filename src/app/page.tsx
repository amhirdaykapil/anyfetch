'use client';

    import React, { useState } from 'react';
    import { Navbar } from '@/components/Navbar';
    import { Footer } from '@/components/Footer';
    import { UrlInputForm } from '@/features/downloader/UrlInputForm';
    import { PlatformPills } from '@/features/downloader/PlatformPills';
    import { MediaResultCard } from '@/features/media-preview/MediaResultCard';
    import { ErrorBanner } from '@/features/downloader/ErrorBanner';
    import { HistoryDrawer } from '@/features/download-history/HistoryDrawer';
    import { useDownloader } from '@/hooks/useDownloader';
    import { useHistory } from '@/features/download-history/useHistory';
    import { PlatformId, MediaFormatOption } from '@/types/media';
    import {
        ShieldCheck,
        Zap,
        HardDriveDownload,
        CheckCircle2,
        Lock,
        Layers,
        ArrowRight,
        ExternalLink,
    } from 'lucide-react';
    import Link from 'next/link';

    export default function HomePage() {
        const { url, setUrl, isLoading, result, error, analyze, retry, clear } = useDownloader();
        const { history, addHistoryItem, removeHistoryItem, clearHistory } = useHistory();
        const [isHistoryOpen, setIsHistoryOpen] = useState(false);
        const [activePlatformId, setActivePlatformId] = useState<PlatformId>('unknown');

        const handleDownloadStarted = (format: MediaFormatOption) => {
            if (!result) return;
            addHistoryItem({
                id: `${result.id}-${format.id}-${Date.now()}`,
                originalUrl: result.originalUrl,
                title: result.title,
                platform: result.platform,
                platformName: result.platformName,
                thumbnailUrl: result.thumbnailUrl,
                mediaType: result.mediaType,
                downloadDate: new Date().toISOString(),
                format: format.format,
                quality: format.quality,
            });
        };

        const handleSelectSample = (sampleUrl: string) => {
            setUrl(sampleUrl);
            analyze(sampleUrl);
        };

        return (
                    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 transition-colors duration-200 dark:bg-[#09090b] dark:text-zinc-100 selection:bg-zinc-200 dark:selection:bg-zinc-800">
                        {/* Top Navigation */}
                        <Navbar
                            historyCount={history.length}
                            onOpenHistory={() => setIsHistoryOpen(true)}
                        />

                        <main className="flex-1">
                            {/* Hero Section */}
                            <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
                                {/* Subtle Grid Background Pattern */}
                                <div
                                    className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.07]"
                                    style={{
                                        backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                                        backgroundSize: '24px 24px',
                                    }}
                                />

                                <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
                                    {/* Minimal Badge */}
                                    <div className="flex justify-center">
                                        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/60 px-3.5 py-1 text-xs font-medium text-zinc-600 shadow-sm backdrop-blur dark:border-white/[0.08] dark:bg-zinc-900/60 dark:text-zinc-400">
                                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span>Next-Gen Media Extraction Engine</span>
                                        </div>
                                    </div>

                                    {/* Main Headline & Subheading */}
                                    <div className="mt-6 text-center">
                                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl lg:text-6xl">
                                            Everything you love. <br className="hidden sm:inline" />
                                            <span className="text-zinc-400 dark:text-zinc-500">One download away.</span>
                                        </h1>
                                        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
                                            Download supported videos, photos, and media from your favorite platforms using just a link.
                                        </p>
                                    </div>

                                    {/* Main Download Input Interface */}
                                    <div className="mt-8 sm:mt-10">
                                        <UrlInputForm
                                            value={url}
                                            onChange={setUrl}
                                            onSubmit={analyze}
                                            isLoading={isLoading}
                                            onClear={clear}
                                            onPlatformDetected={setActivePlatformId}
                                        />
                                    </div>

                                    {/* Clean Platform Icons Row */}
                                    <div className="mt-8">
                                        <PlatformPills
                                            activePlatform={activePlatformId}
                                            onSelectPlatform={(pid) => {
                                                setActivePlatformId(pid);
                                            }}
                                        />
                                    </div>

                                    {/* Quick Sample Presets for Testing */}
                                    <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">Try public demo links:</span>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectSample('https://www.youtube.com/watch?v=jNQXAC9IVRw')}
                                            className="rounded-md border border-zinc-200/60 bg-white/60 px-2 py-0.5 text-[11px] text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-white/[0.06] dark:bg-zinc-900/40 dark:text-zinc-300 dark:hover:text-zinc-100"
                                        >
                                            YouTube (First Video)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectSample('https://www.reddit.com/r/pics/comments/92dd8/test_post_please_ignore/')}
                                            className="rounded-md border border-zinc-200/60 bg-white/60 px-2 py-0.5 text-[11px] text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-white/[0.06] dark:bg-zinc-900/40 dark:text-zinc-300 dark:hover:text-zinc-100"
                                        >
                                            Reddit Public Post
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectSample('https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80')}
                                            className="rounded-md border border-zinc-200/60 bg-white/60 px-2 py-0.5 text-[11px] text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-white/[0.06] dark:bg-zinc-900/40 dark:text-zinc-300 dark:hover:text-zinc-100"
                                        >
                                            Direct Image (Unsplash)
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* Results / Error Section */}
                            {(result || error || isLoading) && (
                                <section className="relative mx-auto max-w-4xl px-4 pb-20 sm:px-6">
                                    {isLoading && (
                                        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-white/80 p-12 text-center shadow-lg dark:border-white/[0.08] dark:bg-zinc-950/80">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900">
                                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent dark:border-zinc-100 dark:border-t-transparent" />
                                            </div>
                                            <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                Inspecting Media Metadata
                                            </h3>
                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
                                                Connecting to authorized platform endpoints and verifying permitted quality streams...
                                            </p>
                                        </div>
                                    )}

                                    {!isLoading && result && (
                                        <MediaResultCard
                                            result={result}
                                            onDownloadStarted={handleDownloadStarted}
                                        />
                                    )}

                                    {!isLoading && error && (
                                        <ErrorBanner error={error} onRetry={retry} />
                                    )}
                                </section>
                            )}

                            {/* Product Craft & Features Section */}
                            <section className="border-t border-zinc-200/60 bg-zinc-100/40 py-20 dark:border-white/[0.06] dark:bg-zinc-900/20">
                                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                                    <div className="text-center max-w-2xl mx-auto">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                                            Engineered for Reliability
                                        </span>
                                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                                            A modern platform built with precision.
                                        </h2>
                                        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                                            No bloated downloads, no fake buttons, no shady redirects. Only clean, fast, authenticated media extraction.
                                        </p>
                                    </div>

                                    <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                        {/* Feature 1 */}
                                        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 dark:border-white/[0.06] dark:bg-zinc-950/60 dark:hover:border-white/[0.12]">
                                            <div>
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                                                    <Zap className="h-5 w-5" />
                                                </div>
                                                <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                    Instant Stream Proxy
                                                </h3>
                                                <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                                    Direct streaming pipeline with verified Content-Disposition headers and safe file naming for seamless downloads.
                                                </p>
                                            </div>
                                            <div className="mt-6 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                <span>Sub-second resolution</span>
                                            </div>
                                        </div>

                                        {/* Feature 2 */}
                                        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 dark:border-white/[0.06] dark:bg-zinc-950/60 dark:hover:border-white/[0.12]">
                                            <div>
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                                                    <HardDriveDownload className="h-5 w-5" />
                                                </div>
                                                <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                    Original Master Quality
                                                </h3>
                                                <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                                    Extract highest permitted quality: 1080p Full HD video streams, uncompressed master photos, and clean audio tracks.
                                                </p>
                                            </div>
                                            <div className="mt-6 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                <span>Up to 4K & Pristine JPGs</span>
                                            </div>
                                        </div>

                                        {/* Feature 3 */}
                                        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 dark:border-white/[0.06] dark:bg-zinc-950/60 dark:hover:border-white/[0.12]">
                                            <div>
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                                                    <ShieldCheck className="h-5 w-5" />
                                                </div>
                                                <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                    SSRF & DNS Shield
                                                </h3>
                                                <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                                    Comprehensive server protection rejecting private subnets, cloud metadata addresses, and internal network queries.
                                                </p>
                                            </div>
                                            <div className="mt-6 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                <span>RFC 1918 & Cloud Guard</span>
                                            </div>
                                        </div>

                                        {/* Feature 4 */}
                                        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 dark:border-white/[0.06] dark:bg-zinc-950/60 dark:hover:border-white/[0.12]">
                                            <div>
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                                                    <Lock className="h-5 w-5" />
                                                </div>
                                                <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                    Zero-Retention Policy
                                                </h3>
                                                <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                                    We never permanently store downloaded content or query URLs on our servers. Download history lives strictly in your browser.
                                                </p>
                                            </div>
                                            <div className="mt-6 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                <span>Encrypted Client Storage</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* How It Works 3-Step Section */}
                            <section className="py-20">
                                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                                    <div className="text-center max-w-xl mx-auto">
                                        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                                            How It Works
                                        </h2>
                                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                            Three steps to access public media from anywhere.
                                        </p>
                                    </div>

                                    <div className="mt-12 grid gap-8 md:grid-cols-3">
                                        <div className="relative rounded-2xl border border-zinc-200/80 bg-white p-6 dark:border-white/[0.06] dark:bg-zinc-950/60">
                                            <span className="font-mono text-2xl font-bold text-zinc-300 dark:text-zinc-800">
                                                01
                                            </span>
                                            <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                                Paste Target Link
                                            </h3>
                                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                                Copy any public link from YouTube, Instagram, Pinterest, TikTok, X, Reddit, Threads, or direct URLs and paste it in the search bar.
                                            </p>
                                        </div>

                                        <div className="relative rounded-2xl border border-zinc-200/80 bg-white p-6 dark:border-white/[0.06] dark:bg-zinc-950/60">
                                            <span className="font-mono text-2xl font-bold text-zinc-300 dark:text-zinc-800">
                                                02
                                            </span>
                                            <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                                Live Media Inspection
                                            </h3>
                                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                                The modular engine identifies the host, performs security checks, retrieves genuine metadata, and parses available stream resolutions.
                                            </p>
                                        </div>

                                        <div className="relative rounded-2xl border border-zinc-200/80 bg-white p-6 dark:border-white/[0.06] dark:bg-zinc-950/60">
                                            <span className="font-mono text-2xl font-bold text-zinc-300 dark:text-zinc-800">
                                                03
                                            </span>
                                            <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                                Direct Download
                                            </h3>
                                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                                Select your desired resolution (1080p, 720p, MP3, JPG) and stream the file directly with sanitized naming into your local downloads.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-12 text-center">
                                        <Link
                                            href="/platforms"
                                            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
                                        >
                                            <span>Read the full Supported Platforms & Compliance Matrix</span>
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            </section>
                        </main>

                        {/* History Slide-over Drawer */}
                        <HistoryDrawer
                            isOpen={isHistoryOpen}
                            onClose={() => setIsHistoryOpen(false)}
                            history={history}
                            onRemove={removeHistoryItem}
                            onClear={clearHistory}
                            onSelectUrl={(selectedUrl) => {
                                setUrl(selectedUrl);
                                analyze(selectedUrl);
                            }}
                        />

                        {/* Footer */}
                        <Footer />
                    </div>
                    );
}
