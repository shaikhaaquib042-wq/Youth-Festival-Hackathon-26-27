"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RootTriagePage() {
  const router = useRouter();
  const [lookupInput, setLookupInput] = useState("");
  const [lookupError, setLookupError] = useState("");

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const val = lookupInput.trim();
    if (!val) return;

    if (val.startsWith("http://") || val.startsWith("https://")) {
      try {
        const u = new URL(val);
        router.push(u.pathname);
        return;
      } catch {
        // fallback
      }
    }

    if (val.length === 36 && val.includes("-")) {
      // UUID token - ask or route to track/verify/donor
      router.push(`/track/${val}`);
    } else {
      setLookupError("Please enter a valid tracking ID or paste your full capability link.");
    }
  };

  return (
    <div className="space-y-6 pt-2">
      {/* Header with Drop Icon */}
      <div className="text-center space-y-2 pt-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--tint)] text-[var(--rt)]">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
            <path d="M12 2s7 7.2 7 12a7 7 0 0 1-14 0c0-4.8 7-12 7-12z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">BloodLink Pune</h1>
          <p className="text-xs text-[var(--mu)] max-w-sm mx-auto mt-1">
            Hyper-local verified blood matching intermediary for Pune hospitals &amp; voluntary donors.
          </p>
        </div>
      </div>

      {/* Main 2 Emergency Actions (48px targets) */}
      <div className="space-y-3 pt-2">
        <Link
          href="/request"
          className="btn w-full min-h-[52px] text-base font-semibold shadow-sm flex items-center justify-center gap-2"
        >
          <span>🩸</span> Need Blood Urgently (Submit Request)
        </Link>
        <Link
          href="/join"
          className="btn2 w-full min-h-[52px] text-base font-semibold flex items-center justify-center gap-2 bg-[var(--sf)]"
        >
          <span>💪</span> Register as Voluntary Donor (30s)
        </Link>
      </div>

      {/* Quick Lookup for Existing Requisition / Capability Link */}
      <div className="card space-y-3">
        <div className="text-xs font-semibold text-[var(--mu)] uppercase tracking-wider">
          Track Requisition or Open Private Link
        </div>
        <form onSubmit={handleLookup} className="space-y-2">
          <input
            type="text"
            placeholder="Paste /track ID, /verify token, or /donor token"
            value={lookupInput}
            onChange={(e) => {
              setLookupInput(e.target.value);
              setLookupError("");
            }}
            className="w-full text-xs font-mono"
          />
          {lookupError && (
            <p className="text-[11px] text-[var(--rt)] font-medium">{lookupError}</p>
          )}
          <button type="submit" className="btn2 w-full text-xs font-semibold min-h-[40px]">
            Open Link →
          </button>
        </form>
      </div>

      {/* Clinical & Regulatory Guardrails (PRD Section 1.2) */}
      <div className="card space-y-3 bg-[var(--sf)]">
        <div className="flex items-center gap-2">
          <span className="text-base">🛡️</span>
          <h2 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
            Clinical Trust &amp; Safety Guardrails
          </h2>
        </div>
        <div className="space-y-2 text-xs text-[var(--mu)] leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="text-[var(--ok)] font-bold">✓</span>
            <span><strong>Zero Public Directory:</strong> Donor phone numbers are never published or exposed. Tokenized communication only.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[var(--ok)] font-bold">✓</span>
            <span><strong>Clinician Sign-Off:</strong> Waves dispatch only after accredited hospital duty doctor verifies the physical slip.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[var(--ok)] font-bold">✓</span>
            <span><strong>NBTC Cooldown Guardrails:</strong> Automated 90-day (Male) / 120-day (Female) whole-blood deferral locks.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[var(--ok)] font-bold">✓</span>
            <span><strong>DPDP Act Compliance:</strong> 1-tap data deletion &amp; auto-purge of requisition slip photos after 7 days.</span>
          </div>
        </div>
      </div>

      {/* Verified Hospital Clusters */}
      <div className="p-3 bg-[var(--tint)] rounded-xl border border-[var(--ln)] text-xs space-y-1">
        <div className="font-semibold text-[var(--rt)] flex items-center gap-1.5">
          <span>🏥</span> Verified Pune Rollout Hospital Clusters
        </div>
        <p className="text-[11px] text-[var(--mu)] leading-normal">
          Sahyadri Deccan • Deenanath Mangeshkar • Bharati Hospital (Sinhagad Rd) • Sassoon General • Jehangir Hospital
        </p>
      </div>
    </div>
  );
}
