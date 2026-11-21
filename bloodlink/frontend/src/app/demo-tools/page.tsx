"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import {
  getLeanMonthEligibleDonors,
  recordLeanReminder,
  simulateNoShowBackfill,
} from "@/lib/api";

export default function DemoToolsPage() {
  const [leanData, setLeanData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null);
  const [nudgeFeedback, setNudgeFeedback] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const data = await getLeanMonthEligibleDonors();
    setLeanData(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSimulateNoShow = async () => {
    setIsProcessing(true);
    setBackfillMessage(null);
    const res = await simulateNoShowBackfill("req-pune-101");
    setBackfillMessage(res.message);
    await loadData();
    setIsProcessing(false);
  };

  const handleSendNudge = async (donorId: string, donorName: string) => {
    await recordLeanReminder(donorId);
    setNudgeFeedback(`Seasonal reminder recorded for ${donorName}. Timestamp stored in lean_month_reminders.`);
    setTimeout(() => setNudgeFeedback(null), 4000);
    await loadData();
  };

  return (
    <div className="space-y-6 pb-16">
      <AppHeader
        title="Admin & Hackathon Evaluator Simulation Dashboard"
        subtitle="Route: /demo-tools • NBTC Cooldown Guardrails & PostGIS Wave Engine"
        badge="Live Interactive Simulator"
        badgeType="ok"
      />

      {/* Explanatory Banner */}
      <div className="card bg-[var(--sf)] p-5 border-l-4 border-l-[#C62828] space-y-1.5 text-xs">
        <h2 className="font-bold text-sm text-[var(--ink)]">
          Clinical Guardrails &amp; Concurrency Demonstration
        </h2>
        <p className="text-[var(--mu)] leading-relaxed">
          This dashboard allows hackathon judges and clinical administrators to inspect and trigger the underlying database RPC functions without waiting for real-world 90-day cooldowns or 45-minute timeout windows.
        </p>
      </div>

      {/* 2-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 Cols): Lean Month Nudge Simulator */}
        <div className="lg:col-span-7 space-y-5">
          <div className="card space-y-4 p-6 bg-[var(--sf)]">
            <div className="flex items-center justify-between border-b border-[var(--ln)] pb-3">
              <div>
                <h3 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                  Seasonal Lean-Month Nudge Simulator
                </h3>
                <p className="text-[11px] text-[var(--mu)] mt-0.5">
                  RPC: <code>get_lean_month_eligible_donors()</code>
                </p>
              </div>
              <span className={`tg ${leanData?.is_lean_season ? "ok" : ""} text-[10px] font-bold uppercase`}>
                {leanData?.season_label?.replace(/_/g, " ") || "STANDARD CYCLE"}
              </span>
            </div>

            <div className="p-3 bg-[var(--bg)] rounded-xl border border-[var(--ln)] text-xs text-[var(--mu)] leading-relaxed">
              During Pune summer exam seasons (Mar–May) and festive months (Aug–Nov), voluntary donations drop up to 50%. This system queries eligible registered donors whose 90/120-day NBTC cooldown has expired and schedules non-intrusive reminders.
            </div>

            {nudgeFeedback && (
              <div className="p-3 bg-[var(--okt)] text-[var(--ok)] rounded-xl text-xs font-semibold border border-[var(--ln)]">
                {nudgeFeedback}
              </div>
            )}

            {loading ? (
              <div className="py-8 text-center text-xs text-[var(--mu)]">
                Querying eligible donor registry...
              </div>
            ) : leanData?.eligible_donors?.length > 0 ? (
              <div className="space-y-3">
                <div className="text-xs font-bold text-[var(--ink)]">
                  Eligible Donors Ready for Gentle Nudge ({leanData.eligible_donors.length}):
                </div>
                <div className="divide-y divide-[var(--ln)] border border-[var(--ln)] rounded-xl overflow-hidden bg-[var(--sf)]">
                  {leanData.eligible_donors.map((d: any) => (
                    <div key={d.donor_id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="font-bold text-[var(--ink)] flex items-center gap-2">
                          <span>{d.full_name}</span>
                          <span className="font-mono text-[var(--rt)] text-xs font-extrabold">{d.blood_group}</span>
                        </div>
                        <div className="text-[11px] text-[var(--mu)] mt-0.5">
                          {d.campus_or_community} • {d.locality_label}
                        </div>
                        <div className="text-[10px] text-[var(--ok)] font-medium mt-0.5">
                          Cooldown expired ({d.biological_sex === "MALE" ? "90d" : "120d"} gap satisfied)
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSendNudge(d.donor_id, d.full_name)}
                        className="btn2 text-xs font-semibold px-3 py-1.5 flex-none"
                      >
                        {d.last_lean_reminder_at ? "Re-send Nudge" : "Send WhatsApp Nudge"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 bg-[var(--bg)] rounded-xl text-center text-xs text-[var(--mu)]">
                All registered donors are currently in active NBTC cooldown.
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 Cols): 45-Min No-Show & PostGIS Backfill */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
          <div className="card space-y-4 p-6 bg-[var(--sf)]">
            <div className="border-b border-[var(--ln)] pb-3">
              <h3 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                Automated No-Show &amp; PostGIS Backfill
              </h3>
              <p className="text-[11px] text-[var(--mu)] mt-0.5">
                RPC: <code>process_no_shows()</code>
              </p>
            </div>

            <p className="text-xs text-[var(--mu)] leading-relaxed">
              If an accepted donor fails to arrive at the hospital within the 45-minute window, the system automatically cancels the slot, increments their no-show count, and fires a targeted backfill wave to the next closest eligible donor in the PostGIS radius.
            </p>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleSimulateNoShow}
              className="btn w-full min-h-[48px] text-xs font-semibold shadow-xs"
            >
              {isProcessing ? "Processing RPC..." : "Simulate 45-Min No-Show & Backfill"}
            </button>

            {backfillMessage && (
              <div className="p-4 bg-[var(--okt)] text-[var(--ok)] rounded-xl text-xs font-medium border border-[var(--ln)] leading-relaxed">
                {backfillMessage}
              </div>
            )}

            <div className="pt-3 border-t border-[var(--ln)] space-y-2">
              <div className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                Inspect Live Platform Screens
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link href="/request" className="btn2 text-center py-2 text-[11px] font-semibold">
                  /request (Intake)
                </Link>
                <Link href="/join" className="btn2 text-center py-2 text-[11px] font-semibold">
                  /join (Donor Registry)
                </Link>
                <Link href="/verify/doc-token-deccan-404" className="btn2 text-center py-2 text-[11px] font-semibold">
                  /verify (Doctor Sign-Off)
                </Link>
                <Link href="/track/req-pune-101" className="btn2 text-center py-2 text-[11px] font-semibold">
                  /track (Live Board)
                </Link>
                <Link href="/donor/donor-token-aditya-11" className="btn2 text-center py-2 text-[11px] font-semibold">
                  /donor (Donor Portal)
                </Link>
                <Link href="/privacy" className="btn2 text-center py-2 text-[11px] font-semibold">
                  /privacy (DPDP Act)
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
