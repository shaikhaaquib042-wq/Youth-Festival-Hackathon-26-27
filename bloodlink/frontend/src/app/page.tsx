"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { store } from "@/lib/store";

export default function RootHomePage() {
  const router = useRouter();
  const [lookupInput, setLookupInput] = useState("");
  const [lookupError, setLookupError] = useState("");

  const activeRequisitions = store.getRequisitions().slice(0, 3);
  const activeDonors = store.getDonors().length;

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

    if (val.startsWith("verify-") || val.startsWith("doc-token-")) {
      router.push(`/verify/${val}`);
    } else if (val.startsWith("donor-")) {
      router.push(`/donor/${val}`);
    } else {
      router.push(`/track/${val}`);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Hero Banner: Clean, Authoritative, Widescreen */}
      <section className="bg-[var(--sf)] border border-[var(--ln)] rounded-3xl p-6 sm:p-10 shadow-xs relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--tint)] text-[var(--rt)] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[var(--rt)] animate-ping" />
            Active Pune Rollout • Sinhagad Rd, Deccan, Erandwane &amp; Sadashiv Peth
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[var(--ink)] leading-tight">
            Hyper-Local Verified <br />
            <span className="text-[var(--rt)]">Emergency Blood Matching</span>
          </h1>

          <p className="text-sm sm:text-base text-[var(--mu)] leading-relaxed max-w-2xl">
            Connecting verified Pune hospitals with nearby voluntary donors via distance-ranked notification waves. Zero public directories, zero phone spam, strict clinician verification, and automated NBTC cooldowns.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/request"
              className="btn min-h-[48px] px-6 text-sm font-semibold shadow-sm flex items-center gap-2"
            >
              <span>🩸</span> Request Blood Urgently
            </Link>
            <Link
              href="/join"
              className="btn2 min-h-[48px] px-6 text-sm font-semibold flex items-center gap-2 bg-[var(--sf)]"
            >
              <span>💪</span> Register as Voluntary Donor
            </Link>
          </div>
        </div>
      </section>

      {/* Main 2-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Command Hub & Quick Lookup */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Tracking & Capability Token Bar */}
          <div className="card space-y-3 p-5 sm:p-6 bg-[var(--sf)]">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                Requisition Tracker &amp; Capability Portal
              </h2>
              <span className="text-[11px] text-[var(--mu)] font-mono">15s Live Edge Poll</span>
            </div>
            <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Enter Requisition ID (e.g. req-pune-101), doctor token, or donor token"
                value={lookupInput}
                onChange={(e) => {
                  setLookupInput(e.target.value);
                  setLookupError("");
                }}
                className="flex-1 text-xs font-mono min-h-[44px]"
              />
              <button
                type="submit"
                className="btn sm:w-auto min-h-[44px] px-5 text-xs font-semibold whitespace-nowrap"
              >
                Track Now →
              </button>
            </form>
            {lookupError && (
              <p className="text-[11px] text-[var(--rt)] font-medium">{lookupError}</p>
            )}
            <div className="flex items-center gap-2 text-[11px] text-[var(--mu)] pt-1 flex-wrap">
              <span>Quick Demos:</span>
              <button
                type="button"
                onClick={() => router.push("/track/req-pune-101")}
                className="text-[var(--rt)] hover:underline font-mono"
              >
                /track/req-pune-101
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => router.push("/verify/doc-token-deccan-404")}
                className="text-[var(--ok)] hover:underline font-mono"
              >
                /verify/doc-token-deccan-404
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => router.push("/donor/donor-token-aditya-11")}
                className="text-[var(--mu)] hover:text-[var(--ink)] hover:underline font-mono"
              >
                /donor/aditya
              </button>
            </div>
          </div>

          {/* Operational Guardrails (PRD Section 1.2) */}
          <div className="card space-y-4 p-5 sm:p-6 bg-[var(--sf)]">
            <h2 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider flex items-center gap-1.5">
              <span>🛡️</span> Strict Clinical &amp; Legal Guardrails
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[var(--mu)]">
              <div className="space-y-1.5 p-3 rounded-xl bg-[var(--bg)] border border-[var(--ln)]">
                <div className="font-bold text-[var(--ink)] flex items-center gap-1">
                  <span className="text-[var(--ok)]">✓</span> Zero Public Directory
                </div>
                <p className="leading-relaxed">
                  Donor contact numbers are never published or sold. All alerts route via private tokenized WhatsApp links.
                </p>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-[var(--bg)] border border-[var(--ln)]">
                <div className="font-bold text-[var(--ink)] flex items-center gap-1">
                  <span className="text-[var(--ok)]">✓</span> Clinician Authorization
                </div>
                <p className="leading-relaxed">
                  Matching waves trigger only after an accredited hospital duty doctor validates the official slip photo.
                </p>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-[var(--bg)] border border-[var(--ln)]">
                <div className="font-bold text-[var(--ink)] flex items-center gap-1">
                  <span className="text-[var(--ok)]">✓</span> NBTC Cooldown Safeguards
                </div>
                <p className="leading-relaxed">
                  Automated 90-day (Male) / 120-day (Female) cooldown locks prevent over-donation and protect donor health.
                </p>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-[var(--bg)] border border-[var(--ln)]">
                <div className="font-bold text-[var(--ink)] flex items-center gap-1">
                  <span className="text-[var(--ok)]">✓</span> 7-Day Auto-Purge &amp; DPDP
                </div>
                <p className="leading-relaxed">
                  Requisition slip photos auto-delete 7 days after fulfillment. Donors have 1-tap permanent erasure rights.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Pune Transfusion & Waves Monitor */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card space-y-4 p-5 sm:p-6 bg-[var(--sf)]">
            <div className="flex items-center justify-between border-b border-[var(--ln)] pb-3">
              <div>
                <h2 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--ok)]" />
                  Live Pune Requisition Feed
                </h2>
                <p className="text-[11px] text-[var(--mu)]">Distance-ranked active notification waves</p>
              </div>
              <span className="tg ok text-[10px] font-mono">
                {activeDonors}+ Donors Ready
              </span>
            </div>

            <div className="space-y-3">
              {activeRequisitions.map((req) => (
                <article
                  key={req.id}
                  className="p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--ln)] space-y-2.5 hover:border-[var(--mu)]/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-badge w-10 h-10 text-sm flex-none">
                        {req.blood_group}
                      </div>
                      <div>
                        <h3 className="font-bold text-xs text-[var(--ink)] leading-snug truncate max-w-[190px]">
                          {req.hospital_name}
                        </h3>
                        <p className="text-[11px] text-[var(--mu)]">{req.patient_reference}</p>
                      </div>
                    </div>
                    <span
                      className={`tg text-[10px] ${
                        req.urgency === "CRITICAL"
                          ? "bg-[var(--tint)] text-[var(--rt)] border border-[var(--rt)]/30"
                          : "ok"
                      }`}
                    >
                      {req.urgency}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[var(--mu)]">
                      <span>Units Needed: <strong>{req.units_needed}</strong></span>
                      <span className="font-mono font-semibold text-[var(--ok)]">
                        {req.units_accepted} of {req.units_needed} Committed
                      </span>
                    </div>
                    <div className="bar" role="progressbar">
                      <i style={{ width: `${Math.min(100, (req.units_accepted / req.units_needed) * 100)}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-[var(--mu)]">
                      Wave {req.current_wave || 1} • {req.waves.length} pinged
                    </span>
                    <Link
                      href={`/track/${req.id}`}
                      className="font-semibold text-[var(--rt)] hover:underline"
                    >
                      View Live Board →
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <div className="pt-2 border-t border-[var(--ln)] flex items-center justify-between text-xs">
              <span className="text-[var(--mu)]">Parallel Inventory:</span>
              <a
                href="https://www.eraktkosh.in"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--ok)] font-semibold hover:underline"
              >
                e-RaktKosh Pune Stock Check ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
