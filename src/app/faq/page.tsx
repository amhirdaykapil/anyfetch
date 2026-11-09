'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ChevronDown, HelpCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQPage() {
  const [openIndices, setOpenIndices] = useState<number[]>([0, 1]);

  const faqs: FAQItem[] = [
    {
      question: 'Is OmniFetch completely free to use?',
      answer:
        'Yes. OmniFetch is 100% free for all users. You do not need an account, credit card, or personal registration to inspect public links and download available media formats.',
    },
    {
      question: 'Do you store copies of the files I download?',
      answer:
        'No. We adhere to a strict Zero-Retention Privacy Policy. Media streams pass directly from the source host through our secure streaming proxy to your browser on the fly. No files, logs, or copies are ever written to server hard drives.',
    },
    {
      question: 'What video and image resolutions are available?',
      answer:
        'We extract the highest available quality provided by the original host. For video platforms (like YouTube, Reddit, X/Twitter), this includes 1080p Full HD, 720p HD, 480p, and 360p. For photo platforms (like Pinterest, Instagram, Reddit), we extract uncompressed master JPG/PNG files.',
    },
    {
      question: 'Can I extract audio or MP3 tracks?',
      answer:
        'Yes! Where authorized and supported (e.g. YouTube videos with separate audio tracks, Reddit video audio, and direct audio files like MP3, WAV, M4A, FLAC), we provide clean audio extraction options.',
    },
    {
      question: 'Why does analysis fail for private accounts or Instagram Stories?',
      answer:
        'OmniFetch strictly complies with platform security boundaries and privacy controls. Content hosted on private Instagram/Threads accounts, protected tweets, private subreddits, or temporary stories cannot and should not be scraped without user authorization. When this happens, we clearly display an explanatory message and link you to the official platform.',
    },
    {
      question: 'How does SSRF protection work?',
      answer:
        'Server-Side Request Forgery (SSRF) protection ensures our backend cannot be tricked into connecting to internal network infrastructure (RFC 1918 private subnets such as 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, loopback 127.0.0.1, or cloud metadata endpoints). All URLs are checked via DNS inspection prior to fetching.',
    },
    {
      question: 'Can I download multi-image posts or galleries?',
      answer:
        'Yes. When you paste a Reddit gallery or Twitter post with multiple photos, OmniFetch displays an interactive carousel with individual download buttons for each master image.',
    },
    {
      question: 'Where is my download history saved?',
      answer:
        'Your download history is saved exclusively in your web browser’s local storage (localStorage). It never touches our server and can be cleared at any time with a single click of the "Clear All" button.',
    },
  ];

  const toggleIndex = (index: number) => {
    setOpenIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 transition-colors duration-200 dark:bg-[#09090b] dark:text-zinc-100">
      <Navbar />

      <main className="flex-1 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/60 px-3.5 py-1 text-xs font-medium text-zinc-600 dark:border-white/[0.08] dark:bg-zinc-900/60 dark:text-zinc-400">
              <HelpCircle className="h-3.5 w-3.5 text-sky-500" />
              <span>Knowledge Base</span>
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
              Frequently Asked Questions
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Answers regarding compliance, supported resolutions, audio extraction, and our zero-retention architecture.
            </p>
          </div>

          {/* Accordion List */}
          <div className="mt-12 space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openIndices.includes(idx);
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-zinc-200/80 bg-white transition-all dark:border-white/[0.06] dark:bg-zinc-950/60"
                >
                  <button
                    type="button"
                    onClick={() => toggleIndex(idx)}
                    className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-zinc-900 dark:text-zinc-100' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-zinc-100 px-5 pt-3 pb-5 text-xs leading-relaxed text-zinc-600 dark:border-white/[0.04] dark:text-zinc-400 sm:text-sm">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Prompt */}
          <div className="mt-14 rounded-2xl border border-zinc-200/80 bg-zinc-100/60 p-6 text-center dark:border-white/[0.08] dark:bg-zinc-900/30">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">
              Have another question or inquiry?
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Check our compliance documentation or reach out to our team directly.
            </p>
            <div className="mt-4 flex justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
              >
                <span>Contact Support</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

