'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Mail, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
    const [submitted, setSubmitted] = useState(false);
    const [category, setCategory] = useState('General Feedback');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !message) return;
        setSubmitted(true);
    };

    return (
        <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 transition-colors duration-200 dark:bg-[#09090b] dark:text-zinc-100">
            <Navbar />

            <main className="flex-1 py-16 sm:py-20">
                <div className="mx-auto max-w-2xl px-4 sm:px-6">
                    <div className="border-b border-zinc-200 pb-8 dark:border-zinc-800">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Get in Touch
                        </span>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
                            Contact Team
                        </h1>
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
                            Inquire about integrations, report issues, or suggest new platform adapters.
                        </p>
                    </div>

                    <div className="mt-8 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:p-8 dark:border-white/[0.08] dark:bg-zinc-950/60">
                        {submitted ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-3">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                    Message Dispatched
                                </h3>
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
                                    Thank you for reaching out. A product engineer will review your inquiry and follow up at {email}.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSubmitted(false);
                                        setMessage('');
                                    }}
                                    className="mt-6 rounded-xl border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                                >
                                    Send Another Message
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Inquiry Topic
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
                                    >
                                        <option value="General Feedback">General Feedback & Ideas</option>
                                        <option value="Platform Request">Suggest New Platform Adapter</option>
                                        <option value="Bug Report">Bug Report / Broken Link</option>
                                        <option value="Security Report">Security & Vulnerability Disclosure</option>
                                        <option value="Partnership">API & Developer Integration</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Your Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@domain.com"
                                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Message *
                                    </label>
                                    <textarea
                                        rows={4}
                                        required
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Provide details or paste the link you encountered issues with..."
                                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-white shadow transition-all hover:bg-zinc-800 active:scale-98 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                    <span>Transmit Message</span>
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
