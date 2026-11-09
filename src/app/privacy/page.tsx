import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Lock, Shield, EyeOff } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 transition-colors duration-200 dark:bg-[#09090b] dark:text-zinc-100">
      <Navbar />

      <main className="flex-1 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="border-b border-zinc-200 pb-8 dark:border-zinc-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Data Governance
            </span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
              Zero-Retention Privacy Policy
            </h1>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Last updated: November 2026 • Strict zero-logging commitment
            </p>
          </div>

          <div className="mt-8 space-y-8 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-sm">
            <section>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-200">
                1. Fundamental Principle: Zero Retention
              </h2>
              <p className="mt-2">
                At OmniFetch, privacy is an architectural guarantee, not an afterthought. When you submit a link to analyze or stream a file, our servers do not log the query, do not store copies of downloaded assets, and do not associate search queries with IP addresses or personal profiles.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-200">
                2. Information Processed in Real Time
              </h2>
              <p className="mt-2">
                During active analysis:
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li><strong className="text-zinc-800 dark:text-zinc-200">URLs:</strong> Processed in volatile memory to query upstream metadata. Discarded immediately after metadata return.</li>
                <li><strong className="text-zinc-800 dark:text-zinc-200">Media Chunks:</strong> Streamed directly from the target CDN to your browser. Chunks are never saved to server storage disks.</li>
                <li><strong className="text-zinc-800 dark:text-zinc-200">IP Addresses:</strong> Used strictly for ephemeral sliding-window rate limiting (stored in temporary RAM token buckets) and immediately purged after the window expires.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-200">
                3. Local Browser Storage
              </h2>
              <p className="mt-2">
                Your Download History lives solely inside your browser&apos;s <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[11px] dark:bg-zinc-800">localStorage</code>. This data never leaves your device and can be cleared at any time by clicking &quot;Clear All&quot; in the history drawer.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-200">
                4. Cookies & Analytics
              </h2>
              <p className="mt-2">
                OmniFetch does not deploy invasive tracking cookies, third-party advertising trackers, or fingerprinting scripts. We store only your theme preference (<code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[11px] dark:bg-zinc-800">omnifetch_theme</code>) in local storage.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-200">
                5. Security Safeguards
              </h2>
              <p className="mt-2">
                All communications between your browser and OmniFetch are encrypted using modern Transport Layer Security (TLS 1.3). Upstream connections enforce strict hostname validation and SSRF firewalls.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

