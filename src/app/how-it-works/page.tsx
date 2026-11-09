import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ShieldCheck, Cpu, ArrowDown, Network, Lock, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HowItWorksPage() {
  const steps = [
    {
      number: '01',
      title: 'URL Submission & SSRF Protection',
      description:
        'When you paste a link, OmniFetch immediately validates the URL structure, parses the hostname, and conducts a deep DNS inspection to guarantee that the destination is a safe public web address. Any requests targeting private network subnets (RFC 1918), local interfaces (127.0.0.1, ::1), or internal cloud metadata servers are instantly rejected before an upstream socket is opened.',
      icon: <ShieldCheck className="h-6 w-6 text-emerald-500" />,
    },
    {
      number: '02',
      title: 'Modular Adapter Dispatch',
      description:
        'Our decoupled adapter architecture routes the URL to its designated platform handler (YouTube, Reddit, Twitter, Pinterest, TikTok, etc.). The adapter leverages official oEmbed endpoints, authorized public metadata APIs, and structured meta tags to inspect available resolutions, audio streams, author credentials, and high-resolution cover photos.',
      icon: <Cpu className="h-6 w-6 text-sky-500" />,
    },
    {
      number: '03',
      title: 'Unified Media Normalization',
      description:
        'Raw responses from different APIs are translated into a standardized MediaResult structure. Whether the post contains a 1080p video, a multi-image gallery, an audio track, or a direct PDF document, OmniFetch presents clean, transparent format choices with genuine file sizes and resolutions.',
      icon: <Network className="h-6 w-6 text-violet-500" />,
    },
    {
      number: '04',
      title: 'Secure Streaming Proxy & File Delivery',
      description:
        'When you click Download, the request is streamed directly via our /api/download pipeline. We attach proper Content-Disposition attachment headers with sanitized, readable filenames and stream the file data on the fly directly to your browser. No files are stored on server disks, ensuring absolute privacy.',
      icon: <Zap className="h-6 w-6 text-amber-500" />,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 transition-colors duration-200 dark:bg-[#09090b] dark:text-zinc-100">
      <Navbar />

      <main className="flex-1 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              System Architecture & Workflow
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
              How OmniFetch Works
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
              A peek under the hood of our secure, zero-retention media inspection and streaming pipeline.
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="mt-16 space-y-8">
            {steps.map((step, idx) => (
              <div
                key={step.number}
                className="relative flex flex-col gap-6 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:p-8 dark:border-white/[0.08] dark:bg-zinc-950/60"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900">
                  {step.icon}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Phase {step.number}
                    </span>
                  </div>

                  <h3 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-sm">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Security Standards Callout */}
          <div className="mt-16 rounded-2xl border border-zinc-200/80 bg-zinc-100/50 p-8 text-center dark:border-white/[0.08] dark:bg-zinc-900/40">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Ready to test a link?
            </h3>
            <p className="mx-auto mt-2 max-w-md text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">
              Paste any public media link from YouTube, Reddit, Instagram, Pinterest, or Twitter and download in seconds.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
              >
                <span>Open Downloader</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

