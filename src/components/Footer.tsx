import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Heart, ArrowUpRight } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export function Footer() {
  return (
    <footer className="w-full border-t border-zinc-200/80 bg-zinc-50/50 py-12 dark:border-white/[0.08] dark:bg-zinc-950/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Info */}
          <div className="sm:col-span-2">
            <BrandLogo />
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              High-performance universal media extraction engine. Inspect and download supported public videos, photos, and media across the modern web in highest permitted resolution.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-500">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Strict zero-retention security & SSRF protection</span>
            </div>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
              Product
            </h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/" className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  Universal Downloader
                </Link>
              </li>
              <li>
                <Link href="/platforms" className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  Supported Platforms
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Policy */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
              Compliance & Legal
            </h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/terms" className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/dmca" className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  DMCA & Copyright Takedown
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
              Connect
            </h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/contact" className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                  Contact Team
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  <span>API Status</span>
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-zinc-200/60 pt-6 text-[11px] text-zinc-500 sm:flex-row dark:border-white/[0.06] dark:text-zinc-500">
          <p>© 2026 OmniFetch Inc. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built for creators, researchers, and public media archival.
          </p>
        </div>
      </div>
    </footer>
  );
}

