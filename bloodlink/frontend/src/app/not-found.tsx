"use client";

import React from "react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col justify-center items-center text-center px-2 space-y-5">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--tint)] text-[var(--rt)]">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
          <path d="M12 2s7 7.2 7 12a7 7 0 0 1-14 0c0-4.8 7-12 7-12z" />
        </svg>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-[var(--ink)]">404 — Page Not Found</h1>
        <p className="text-xs text-[var(--mu)] max-w-xs mx-auto">
          The link you opened may have expired or is incorrect. Instant recovery actions:
        </p>
      </div>

      <div className="w-full max-w-xs space-y-2.5 pt-2">
        <Link href="/request" className="btn w-full min-h-[48px] text-xs font-semibold text-center flex items-center justify-center gap-1.5">
          <span>🩸</span> Need Blood Urgently (/request)
        </Link>
        <Link href="/join" className="btn2 w-full min-h-[48px] text-xs font-semibold text-center flex items-center justify-center gap-1.5 bg-[var(--sf)]">
          <span>💪</span> Register as Voluntary Donor (/join)
        </Link>
        <Link href="/" className="text-xs text-[var(--mu)] hover:text-[var(--ink)] block pt-2">
          ← Back to BloodLink Pune
        </Link>
      </div>
    </div>
  );
}
