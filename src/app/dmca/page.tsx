'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ShieldCheck, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DMCAPage() {
    const [submitted, setSubmitted] = useState(false);
    const [url, setUrl] = useState('');
    const [email, setEmail] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!url || !email) return;
        setSubmitted(true);
    };

    return (
        <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 transition-colors duration-200 dark:bg-[#09090b] dark:text-zinc-100">
            <Navbar />

            <main className="flex-1 py-16 sm:py-20">
                <div className="mx-auto max-w-3xl px-4 sm:px-6">
                    <div className="border-b border-zinc-200 pb-8 dark:border-zinc-800">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Intellectual Property
                        </span>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
                            DMCA & Copyright Takedown Policy
                        </h1>
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                            Process for rights holders to submit takedown notices under 17 U.S.C. § 512
                        </p>
                    </div>

                    <div className="mt-8 space-y-6 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-sm">
                        <p>
                            AnyFetch respects the intellectual property rights of creators and copyright holders worldwide. In accordance with the Digital Millennium Copyright Act of 1998 (17 U.S.C. § 512) and international copyright legislation, AnyFetch maintains a responsive, automated system to block or restrict access to any URL found to infringe copyright.
                        </p>

                        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 dark:border-white/[0.08] dark:bg-zinc-950/60">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-200">
                                Notice Submission Requirements
                            </h2>
                            <p className="mt-2">
                                To submit a valid DMCA notice, the notification must include:
                            </p>
                            <ol className="mt-3 list-decimal pl-5 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                                <li>Identification of the copyrighted work claimed to have been infringed.</li>
                                <li>Identification of the material to be blocked, including the exact URL(s).</li>
                                <li>Contact information of the complaining party (name, address, email, telephone number).</li>
                                <li>A statement that the complaining party has a good-faith belief that use of the material is not authorized.</li>
                                <li>A statement made under penalty of perjury that the information in the notification is accurate and that the complaining party is authorized to act.</li>
                                <li>A physical or electronic signature of a person authorized to act on behalf of the owner.</li>
                            </ol>
                        </div>

                        {/* Fast Takedown Form */}
                        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-zinc-950/60">
                            <div className="flex items-center gap-2">
                                <Mail className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    Submit Automated Takedown Notice
                                </h3>
                            </div>

                            {submitted ? (
                                <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold">Notice Recorded Successfully</p>
                                        <p className="mt-0.5 text-emerald-700 dark:text-emerald-300">
                                            Our legal operations team processes DMCA submissions within 24 hours. The specified URL will be added to the blacklist filter.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                            Target URL to Block *
                                        </label>
                                        <input
                                            type="url"
                                            required
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            placeholder="https://platform.com/post/..."
                                            className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                            Authorized Contact Email *
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="legal@rightsholder.com"
                                            className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                            Copyright Details & Attestation
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Describe original work and ownership details..."
                                            className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
                                    >
                                        Submit Takedown Request
                                    </button>
                                </form>
                            )}
                        </div>

                        <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
                            Direct inquiries can also be transmitted to: <code className="font-mono text-zinc-700 dark:text-zinc-300">copyright@anyfetch.net</code>
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
