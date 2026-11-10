import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ShieldCheck, Scale, AlertCircle } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 transition-colors duration-200 dark:bg-[#09090b] dark:text-zinc-100">
      <Navbar />

      <main className="flex-1 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="border-b border-zinc-200 pb-8 dark:border-zinc-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Legal Agreement
            </span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
              Terms of Service
            </h1>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Last updated: November 2026 • Effective immediately
            </p>
          </div>

          <div className="mt-8 space-y-8 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-sm">
            <section>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-200">
                1. Acceptance of Terms
              </h2>
              <p className="mt-2">
                By accessing or using AnyFetch (&quot;the Service&quot;), you agree to be bound by these Terms of Service and all applicable federal, state, and international copyright laws. If you do not agree to these terms, do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-200">
                2. Nature of Service & Compliance
              </h2>
              <p className="mt-2">
                AnyFetch provides an automated web interface for inspecting publicly accessible media URLs and downloading permitted formats. AnyFetch is an intermediary technical tool. AnyFetch does NOT:
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>Bypass digital rights management (DRM) or encryption mechanisms.</li>
                <li>Access private, restricted, or password-protected user accounts.</li>
                <li>Store copies of third-party media permanently on server infrastructure.</li>
                <li>Own or claim copyright over any media queried through the interface.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-200">
                3. Permitted & Acceptable Use
              </h2>
              <p className="mt-2">
                You agree to use AnyFetch exclusively for personal, educational, research, fair use, or content-creator archival purposes where you own the content or have obtained express authorization from the rights holder. You shall not use AnyFetch for commercial copyright infringement, unlawful redistribution, or automated denial-of-service scraping.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-200">
                4. Third-Party Platform Terms
              </h2>
              <p className="mt-2">
                Users acknowledge that third-party services (including YouTube, Instagram, Reddit, Pinterest, TikTok, and X) maintain independent Terms of Service. You are solely responsible for ensuring your personal usage complies with each platform&apos;s published policies.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-200">
                5. Disclaimer of Warranties & Limitation of Liability
              </h2>
              <p className="mt-2">
                The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind. AnyFetch shall not be held liable for any direct, indirect, incidental, or consequential damages resulting from user misuse or third-party copyright claims.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

