"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { CountdownTimer } from "@/components/CountdownTimer";
import { getTrackingStatus } from "@/lib/api";

export default function TrackRequestIdPage() {
  const params = useParams();
  const requestId = params?.request_id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchStatus = async (showLoading = false) => {
    if (!requestId) return;
    if (showLoading) setLoading(true);

    const res = await getTrackingStatus(requestId);
    if (res.data) {
      setData(res.data);
      setError(null);
    } else {
      setError(res.error || "Unable to load status.");
    }
    setLastRefreshed(new Date());
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    fetchStatus(true);
    const interval = setInterval(() => {
      fetchStatus(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [requestId]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-2">
        <div className="text-3xl animate-bounce">📡</div>
        <p className="text-xs text-[var(--mu)] font-medium">Connecting to live matching board...</p>
      </div>
    );
  }

  const isPending = data?.status === "PENDING_VERIFICATION";
  const isActive = data?.status === "VERIFIED_ACTIVE";
  const isFulfilled = data?.status === "FULFILLED";
  const isExpired = data?.status === "EXPIRED";

  const waveSummary = data?.wave_summary || {};
  const waveKeys = Object.keys(waveSummary);
  const activeArrivals = data?.active_arrivals || [];

  return (
    <div className="space-y-5 pb-8">
      <AppHeader
        title="Live Requisition Status"
        subtitle="Private Tracking Board • 15s Edge Refresh"
        bloodGroup={data?.blood_group}
        badge="📡 Live Sync"
        badgeType="ok"
        backHref="/"
        backLabel="Home"
      />

      {/* Verification State Banner */}
      <div className="card space-y-1.5 border-l-4 border-l-[#C62828]">
        <div className="text-[11px] font-semibold text-[var(--mu)] uppercase tracking-wider">
          Coordination Progress
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-sm text-[var(--ink)]">
            {isPending && "⏳ Awaiting Duty Doctor Sign-Off"}
            {isActive && `🟢 Wave ${data?.current_wave || 1} Dispatched • Nearest Donors Alerted`}
            {isFulfilled && "✓ Requisition Fulfilled"}
            {isExpired && "⏰ 12-Hour Window Expired"}
          </span>
          <UrgencyBadge urgency={data?.urgency || "CRITICAL"} />
        </div>
        {isPending && (
          <p className="text-xs text-[var(--mu)] pt-1">
            Requisition slip uploaded. Hospital duty doctor will verify authenticity before wave dispatch begins.
          </p>
        )}
      </div>

      {/* Hospital & Units Overview */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--ln)] pb-2.5">
          <div>
            <div className="text-[11px] text-[var(--mu)]">Designated Hospital</div>
            <div className="font-bold text-sm text-[var(--ink)]">{data?.hospital_name}</div>
          </div>
          {data?.bloodbank_phone && (
            <a
              href={`tel:${data.bloodbank_phone}`}
              className="text-xs font-semibold text-[var(--ok)] hover:underline flex items-center gap-1"
            >
              <span>📞</span> Call Desk
            </a>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="bg-[var(--bg)] p-2.5 rounded-xl border border-[var(--ln)]">
            <div className="text-[10px] text-[var(--mu)] uppercase font-semibold">Blood Group</div>
            <div className="text-xl font-mono font-extrabold text-[var(--rt)] mt-0.5">{data?.blood_group}</div>
          </div>
          <div className="bg-[var(--bg)] p-2.5 rounded-xl border border-[var(--ln)]">
            <div className="text-[10px] text-[var(--mu)] uppercase font-semibold">Component</div>
            <div className="text-xs font-bold text-[var(--ink)] mt-1.5 truncate">{data?.component}</div>
          </div>
          <div className="bg-[var(--bg)] p-2.5 rounded-xl border border-[var(--ln)]">
            <div className="text-[10px] text-[var(--mu)] uppercase font-semibold">Units Fulfilled</div>
            <div className="text-lg font-mono font-bold text-[var(--ink)] mt-1">
              {data?.units_accepted} / {data?.units_needed}
            </div>
          </div>
        </div>
      </div>

      {/* Wave Breakdown */}
      {isActive && (
        <div className="card space-y-3">
          <div className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
            Active Wave Breakdown
          </div>

          {waveKeys.length > 0 ? (
            <div className="space-y-2">
              {waveKeys.map((k) => {
                const w = waveSummary[k];
                const waveNum = k.replace("wave_", "");
                return (
                  <div
                    key={k}
                    className="p-3 bg-[var(--bg)] rounded-xl border border-[var(--ln)] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-[var(--ink)]">Wave {waveNum} (Capped 12 Donors)</div>
                      <div className="text-[var(--mu)] mt-0.5">
                        <strong>{w.total}</strong> pinged within {w.radius_km || 3} km
                      </div>
                    </div>
                    <span className="tg ok">
                      {w.accepted} Committed
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-[var(--mu)] bg-[var(--bg)] p-3 rounded-xl text-center">
              Evaluating closest voluntary donors in radius...
            </div>
          )}

          {/* In-Transit Donors with Ticking Countdowns */}
          {activeArrivals.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[var(--ln)]">
              <div className="text-xs font-bold text-[var(--ok)] flex items-center gap-1.5">
                <span>⏱️</span>
                <span>Donors Currently En Route ({activeArrivals.length})</span>
              </div>
              {activeArrivals.map((arr: any, i: number) => (
                <div
                  key={i}
                  className="p-3 bg-[var(--okt)]/30 border border-[var(--ln)] rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-[var(--ink)]">Incoming Donor #{i + 1}</div>
                    <div className="text-[var(--mu)] font-mono">{arr.distance_km} km away</div>
                  </div>
                  <CountdownTimer deadline={arr.arrival_deadline} label="45-Min Window" size="md" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Parallel e-RaktKosh Prompt */}
      <div className="card bg-[var(--tint)] border-[var(--ln)] space-y-2 p-3.5">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">🏛️</span>
          <div className="text-xs font-bold text-[var(--rt)]">
            e-RaktKosh Parallel Inventory Lookup
          </div>
        </div>
        <p className="text-xs text-[var(--mu)] leading-relaxed">
          While waves are active, check government &amp; private blood bank inventory across Pune in parallel:
        </p>
        <a
          href={data?.eraktkosh_url || "https://www.eraktkosh.in"}
          target="_blank"
          rel="noreferrer"
          className="btn2 w-full min-h-[40px] text-xs font-semibold text-center block bg-[var(--sf)] hover:bg-[var(--bg)]"
        >
          Check Pune Blood Banks on e-RaktKosh ↗
        </a>
      </div>

      {/* Sync Footer */}
      <div className="flex items-center justify-between text-[11px] text-[var(--mu)] pt-2 px-1">
        <span>Polls every 15s (Edge cached)</span>
        <button
          type="button"
          onClick={() => fetchStatus(false)}
          className="hover:text-[var(--ink)] underline font-medium"
        >
          Synced: {lastRefreshed.toLocaleTimeString()}
        </button>
      </div>
    </div>
  );
}
