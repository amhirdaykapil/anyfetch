'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    Loader2,
    Sparkles,
} from 'lucide-react';
import Link from 'next/link';

    export default function HomePage() {
        const { url, setUrl, isLoading, result, error, analyze, retry, clear } = useDownloader();
        const { history, addHistoryItem, removeHistoryItem, clearHistory } = useHistory();
        const [isHistoryOpen, setIsHistoryOpen] = useState(false);
        const [activePlatformId, setActivePlatformId] = useState<PlatformId>('unknown');

        const isWorkspaceMode = Boolean(result || error || isLoading);

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

                                return(
        <div className = "flex min-h-screen flex-col bg-zinc-50 text-zinc-900 transition-colors duration-200 dark:bg-[#09090b] dark:text-zinc-100 selection:bg-zinc-200 dark:selection:bg-zinc-800" >
                                        {/* Top Navigation */ }
                                        < Navbar
                historyCount = { history.length }
                onOpenHistory = {() => setIsHistoryOpen(true)}
            />

                        <main className="flex-1 flex flex-col">
                            {/* Dynamic Hero / Workspace Container */}
                            <section
                                className={`relative overflow-hidden transition-all duration-500 ease-out ${isWorkspaceMode
                                        ? 'pt-4 sm:pt-6 pb-8'
                                        : 'min-h-[calc(100vh-4.5rem)] flex flex-col justify-center py-10 sm:py-16'
                                    }`}
                            >
                                {/* Subtle Radial Grid Pattern */}
                                <div
                                    className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.07]"
                                    style={{
                                        backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                                        backgroundSize: '24px 24px',
                                    }}
                                />

                                <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6">
                                    {/* Initial Hero Content (Fades & Translates Upward on Download) */}
                                    <AnimatePresence>
                                        {!isWorkspaceMode && (
                                <motion.div
                                    key="hero-header"
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{
                                        opacity: 0,
                                        y: -25,
                                        transition: { duration: 0.35, ease: 'easeOut' },
                                    }}
                                    transition={{ duration: 0.4 }}
                                    className="text-center"
                                >
                                    {/* Minimal Eyebrow Badge */}
                                    <div className="flex justify-center">
                                        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/70 px-3.5 py-1 text-xs font-medium text-zinc-600 shadow-sm backdrop-blur dark:border-white/[0.08] dark:bg-zinc-900/60 dark:text-zinc-400">
                                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span>Universal High-Quality Media Downloader</span>
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
                                </motion.div>
                            )}
                        </AnimatePresence>

                                        {/* Coordinated URL Input Form (Smoothly slides from center to compact top position) */}
                                        <motion.div
                                            layout="position"
                                            transition={{
                                                type: 'spring',
                                                stiffness: 350,
                                                damping: 32,
                                            }}
                                            className={`w-full transition-all duration-300 ${isWorkspaceMode ? 'mt-0' : 'mt-8 sm:mt-10'
                                                }`}
                                        >
                                            <UrlInputForm
                                                value={url}
                                                onChange={setUrl}
                                                onSubmit={analyze}
                                                isLoading={isLoading}
                                                onClear={clear}
                                                onPlatformDetected={setActivePlatformId}
                                            />
                                        </motion.div>

                                        {/* Initial Platform Pills & Demo Links (Fade out upward on Download) */}
                                        <AnimatePresence>
                                            {!isWorkspaceMode && (
                                                <motion.div
                                                    key="hero-extras"
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{
                                                        opacity: 0,
                                                        y: -20,
                                                        transition: { duration: 0.3, ease: 'easeOut' },
                                                    }}
                                                    transition={{ duration: 0.4, delay: 0.05 }}
                                                >
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
                                                        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                                                            Try public demo links:
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleSelectSample('https://www.youtube.com/watch?v=jNQXAC9IVRw')
                                                            }
                                                            className="rounded-md border border-zinc-200/60 bg-white/60 px-2 py-0.5 text-[11px] text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-white/[0.06] dark:bg-zinc-900/40 dark:text-zinc-300 dark:hover:text-zinc-100"
                                                        >
                                                            YouTube (First Video)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleSelectSample('https://www.pinterest.com/pin/185773553372863481/')
                                                            }
                                                            className="rounded-md border border-zinc-200/60 bg-white/60 px-2 py-0.5 text-[11px] text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-white/[0.06] dark:bg-zinc-900/40 dark:text-zinc-300 dark:hover:text-zinc-100"
                                                        >
                                                            Pinterest (Video Pin)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleSelectSample('https://www.redditstatic.com/reddit.com.header.png')
                                                            }
                                                            className="rounded-md border border-zinc-200/60 bg-white/60 px-2 py-0.5 text-[11px] text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-white/[0.06] dark:bg-zinc-900/40 dark:text-zinc-300 dark:hover:text-zinc-100"
                                                        >
                                                            Reddit (Asset PNG)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleSelectSample('https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800')
                                                            }
                                                            className="rounded-md border border-zinc-200/60 bg-white/60 px-2 py-0.5 text-[11px] text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-white/[0.06] dark:bg-zinc-900/40 dark:text-zinc-300 dark:hover:text-zinc-100"
                                                        >
                                                            Direct JPG (Unsplash)
                                                        </button>
                                                    </div>
                                </motion.div>
                            )}
                                </AnimatePresence>

                                                    {/* Dynamic Workspace Area (Loading, Results, or Error) */}
                                                    <AnimatePresence mode="wait">
                                                        {/* Loading State Skeleton */}
                                                        {isLoading && (
                                                            <motion.div
                                                                key="workspace-loading"
                                                                initial={{ opacity: 0, y: 25 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -15, transition: { duration: 0.25 } }}
                                                                transition={{ duration: 0.4, ease: 'easeOut' }}
                                                                className="mt-6 w-full"
                                                            >
                                                                <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/95 p-6 shadow-xl dark:border-white/[0.08] dark:bg-zinc-950/80 dark:shadow-2xl">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900">
                                                                            <Loader2 className="h-5 w-5 animate-spin text-zinc-900 dark:text-zinc-100" />
                                                                        </div>
                                                                        <div>
                                                                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                                                    Analyzing media...
                                                                                </h3>
                                                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                                                        Identifying authorized media streams and permitted quality formats
                                                                                    </p>
                                                                                </div>
                                                                        </div>

                                                                                    <div className="mt-6 grid gap-6 lg:grid-cols-12">
                                                                                        <div className="aspect-video w-full animate-pulse rounded-xl bg-zinc-200/70 dark:bg-zinc-900 lg:col-span-5" />
                                                                                        <div className="space-y-3 lg:col-span-7">
                                                                                            <div className="h-6 w-3/4 animate-pulse rounded-lg bg-zinc-200/70 dark:bg-zinc-900" />
                                                                                            <div className="h-4 w-1/2 animate-pulse rounded-lg bg-zinc-200/50 dark:bg-zinc-900/60" />
                                                                                            <div className="mt-4 space-y-2">
                                                                                                <div className="h-12 w-full animate-pulse rounded-xl bg-zinc-200/50 dark:bg-zinc-900/60" />
                                                                                                <div className="h-12 w-full animate-pulse rounded-xl bg-zinc-200/50 dark:bg-zinc-900/60" />
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </motion.div>
                            )}

                                                                            {/* Error State */}
                                                                            {!isLoading && error && (
                                                                                <motion.div
                                                                                    key="workspace-error"
                                                                                    initial={{ opacity: 0, y: 25 }}
                                                                                    animate={{ opacity: 1, y: 0 }}
                                                                                    exit={{ opacity: 0, y: -15, transition: { duration: 0.25 } }}
                                                                                    transition={{ duration: 0.4, ease: 'easeOut' }}
                                                                                    className="mt-6 w-full"
                                                                                >
                                                                                    <ErrorBanner error={error} onRetry={retry} />
                                                                                </motion.div>
                                                                            )}

                                                                            {/* Results Workspace State */}
                                                                            {!isLoading && result && (
                                                                                <motion.div
                                                                                    key="workspace-result"
                                                                                    initial={{ opacity: 0, y: 30 }}
                                                                                    animate={{ opacity: 1, y: 0 }}
                                                                                    exit={{ opacity: 0, y: 20, transition: { duration: 0.3 } }}
                                                                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                                                                    className="mt-6 w-full"
                                                                                >
                                                                                    <MediaResultCard
                                                                                        result={result}
                                                                                        onDownloadStarted={handleDownloadStarted}
                                                                                    />
                                                                                </motion.div>
                                                                            )}
                                                                        </AnimatePresence>
                                                                    </div>
                                                                </section>

                                                                {/* Landing Page Content (Product craft, features, FAQ link) */}
                                                                <section className="mt-auto border-t border-zinc-200/60 bg-zinc-100/40 py-16 dark:border-white/[0.06] dark:bg-zinc-900/20">
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
                                                                        </div>

                                                                                    {/* Feature 2 */}
                                                                                    <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 dark:border-white/[0.06] dark:bg-zinc-950/60 dark:hover:border-white/[0.12]">
                                                                                        <div>
                                                                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                                                                                                <ShieldCheck className="h-5 w-5" />
                                                                                            </div>
                                                                                            <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                                                                Enterprise SSRF Defense
                                                                                            </h3>
                                                                                            <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                                                                                Multi-hop DNS and private IP range filtering blocks private intranet probes and malicious redirects before execution.
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>

                                                                                        {/* Feature 3 */}
                                                                                        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 dark:border-white/[0.06] dark:bg-zinc-950/60 dark:hover:border-white/[0.12]">
                                                                                            <div>
                                                                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                                                                                                    <HardDriveDownload className="h-5 w-5" />
                                                                                                </div>
                                                                                                <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                                                                    Chunked Binary Streaming
                                                                                                </h3>
                                                                                                <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                                                                                    Zero-disk buffer streaming sends files directly from upstream CDNs to your browser without memory bottlenecks.
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>

                                                                                            {/* Feature 4 */}
                                                                                            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 dark:border-white/[0.06] dark:bg-zinc-950/60 dark:hover:border-white/[0.12]">
                                                                                                <div>
                                                                                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                                                                                                        <Lock className="h-5 w-5" />
                                                                                                    </div>
                                                                                                    <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                                                                        Privacy-First Architecture
                                                                                                    </h3>
                                                                                                    <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                                                                                        No account required, no tracking cookies, and no permanent server storage of downloaded media assets.
                                                                                                    </p>
                                                                                                </div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Direct Link to Supported Platforms & FAQ */}
                                                                                <div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
                                                                                    <Link
                                                                                        href="/platforms"
                                                                                        className="flex items-center gap-1.5 rounded-lg border border-zinc-300/80 bg-white px-4 py-2 text-zinc-700 shadow-sm transition hover:bg-zinc-100 dark:border-white/[0.1] dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                                                                    >
                                                                                        <span>Supported Platforms & Limits</span>
                                                                                        <ArrowRight className="h-3.5 w-3.5" />
                                                                                    </Link>
                                                                                    <Link
                                                                                        href="/faq"
                                                                                        className="flex items-center gap-1.5 rounded-lg border border-zinc-300/80 bg-white px-4 py-2 text-zinc-700 shadow-sm transition hover:bg-zinc-100 dark:border-white/[0.1] dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                                                                    >
                                                                                        <span>Frequently Asked Questions</span>
                                                                                        <ArrowRight className="h-3.5 w-3.5" />
                                                                                    </Link>
                                                                                </div>
                                                                            </div>
                                                                        </section>
                                                                    </main>

                                                                {/* History Drawer */}
                                                                <HistoryDrawer
                                                                    isOpen={isHistoryOpen}
                                                                    onClose={() => setIsHistoryOpen(false)}
                                                                    history={history}
                                                                    onSelectUrl={(url) => {
                                                                        setUrl(url);
                                                                        analyze(url);
                                                                    }}
                                                                    onClear={clearHistory}
                                                                    onRemove={removeHistoryItem}
                                                                />

                                                                {/* Footer */}
                                                                <Footer />
                                                            </div>
                                                        );
}
