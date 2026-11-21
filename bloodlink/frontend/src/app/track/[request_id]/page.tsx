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
  const [copied, setCopied] = useState(false);

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

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

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
  const percentComplete = Math.min(100, ((data?.units_accepted || 0) / (data?.units_needed || 1)) * 100);

  return (
    <div className="space-y-6 pb-12">
      <AppHeader
        title={`Live Tracking: ${data?.hospital_name || "Requisition"}`}
        subtitle={`ID: ${requestId} • 15s edge poll`}
        bloodGroup={data?.blood_group}
        badge="📡 Live Sync"
        badgeType="ok"
        backHref="/"
        backLabel="Home"
      />

      {/* 2-Column Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols): Coordination State & Waves */}
        <div className="lg:col-span-7 space-y-5">
          {/* Status Banner */}
          <div className="card space-y-2 p-5 sm:p-6 bg-[var(--sf)] border-l-4 border-l-[#C62828]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--mu)] uppercase tracking-wider">
                Requisition State
              </span>
              <UrgencyBadge urgency={data?.urgency || "CRITICAL"} />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-mono font-bold text-base sm:text-lg text-[var(--ink)]">
                {isPending && "⏳ Awaiting Duty Doctor Sign-Off"}
                {isActive && `🟢 Wave ${data?.current_wave || 1} Active • Donors Alerted`}
                {isFulfilled && "✓ Requisition Fulfilled"}
                {isExpired && "⏰ 12-Hour Window Expired"}
              </span>
            </div>

            {isPending && (
              <p className="text-xs text-[var(--mu)] pt-1 leading-relaxed">
                Hospital requisition slip is awaiting review by the duty doctor. Once verified, PostGIS will instantly dispatch Wave 1 to 10–15 nearest eligible donors.
              </p>
            )}
          </div>

          {/* Active Waves Breakdown */}
          {isActive && (
            <div className="card space-y-4 p-5 sm:p-6 bg-[var(--sf)]">
              <div className="flex items-center justify-between border-b border-[var(--ln)] pb-3">
                <h2 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                  Wave Matching Status
                </h2>
                <span className="text-xs text-[var(--mu)] font-mono">
                  Radius: ~{data?.current_radius_meters / 1000 || 3} km
                </span>
              </div>

              {waveKeys.length > 0 ? (
                <div className="space-y-2.5">
                  {waveKeys.map((k) => {
                    const w = waveSummary[k];
                    const waveNum = k.replace("wave_", "");
                    return (
                      <div
                        key={k}
                        className="p-3.5 bg-[var(--bg)] rounded-2xl border border-[var(--ln)] flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-[var(--ink)]">Wave {waveNum} (Capped Notification Wave)</div>
                          <div className="text-[var(--mu)] mt-0.5">
                            <strong>{w.total}</strong> donors pinged within {w.radius_km || 3} km
                          </div>
                        </div>
                        <span className="tg ok font-semibold">
                          {w.accepted} Accepted
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-[var(--mu)] bg-[var(--bg)] p-4 rounded-xl text-center">
                  Calculating nearest donor coordinates...
                </div>
              )}

              {/* In-Transit Donors with Ticking Countdowns */}
              {activeArrivals.length > 0 && (
                <div className="space-y-2.5 pt-3 border-t border-[var(--ln)]">
                  <div className="text-xs font-bold text-[var(--ok)] flex items-center gap-1.5">
                    <span>⏱️</span>
                    <span>Donors Currently En Route ({activeArrivals.length}):</span>
                  </div>
                  {activeArrivals.map((arr: any, i: number) => (
                    <div
                      key={i}
                      className="p-3 bg-[var(--okt)]/30 border border-[var(--ln)] rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-[var(--ink)]">Donor #{i + 1} Committed</div>
                        <div className="text-[var(--mu)] font-mono">{arr.distance_km} km from hospital</div>
                      </div>
                      <CountdownTimer deadline={arr.arrival_deadline} label="45-Min Arrival Window" size="md" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Parallel e-RaktKosh Lookup Prompt (PRD Section 5.1) */}
          <div className="card bg-[var(--tint)] border-[var(--ln)] space-y-2.5 p-5">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">🏛️</span>
              <h3 className="text-xs font-bold text-[var(--rt)] uppercase tracking-wider">
                e-RaktKosh Parallel Inventory Lookup
              </h3>
            </div>
            <p className="text-xs text-[var(--mu)] leading-relaxed">
              For emergency cases or rare blood groups, check live government and private blood bank stock levels across Pune simultaneously:
            </p>
            <a
              href={data?.eraktkosh_url || "https://www.eraktkosh.in"}
              target="_blank"
              rel="noreferrer"
              className="btn2 w-full min-h-[44px] text-xs font-semibold text-center flex items-center justify-center bg-[var(--sf)] hover:bg-[var(--bg)]"
            >
              Search Pune Blood Banks on e-RaktKosh ↗
            </a>
          </div>
        </div>

        {/* Right Column (5 cols): Hospital Details & Progress Sidebar */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          {/* Requisition Units Progress */}
          <div className="card space-y-4 p-5 sm:p-6 bg-[var(--sf)]">
            <div className="flex items-center justify-between border-b border-[var(--ln)] pb-3">
              <span className="text-[11px] font-bold text-[var(--mu)] uppercase tracking-wider">
                Fulfillment Progress
              </span>
              <span className="font-mono font-bold text-sm text-[var(--ok)]">
                {data?.units_accepted} of {data?.units_needed} Units
              </span>
            </div>

            <div className="bar" role="progressbar" aria-valuenow={percentComplete} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${percentComplete}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-[var(--bg)] p-2.5 rounded-xl border border-[var(--ln)]">
                <span className="text-[10px] text-[var(--mu)] uppercase block">Blood Group</span>
                <span className="font-mono font-extrabold text-xl text-[var(--rt)]">{data?.blood_group}</span>
              </div>
              <div className="bg-[var(--bg)] p-2.5 rounded-xl border border-[var(--ln)]">
                <span className="text-[10px] text-[var(--mu)] uppercase block">Component</span>
                <span className="font-bold text-xs text-[var(--ink)] block mt-1 truncate">{data?.component}</span>
              </div>
            </div>
          </div>

          {/* Hospital Blood Bank Desk */}
          <div className="card space-y-3 p-5 sm:p-6 bg-[var(--sf)]">
            <h3 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
              Receiving Hospital
            </h3>
            <div>
              <h4 className="font-bold text-sm text-[var(--ink)]">{data?.hospital_name}</h4>
              <p className="text-xs text-[var(--mu)] mt-0.5">
                {data?.hospital_address || "Pune, Maharashtra"}
              </p>
            </div>

            {data?.bloodbank_phone && (
              <a
                href={`tel:${data.bloodbank_phone}`}
                className="btn2 w-full min-h-[42px] text-xs font-semibold flex items-center justify-center gap-1.5 text-[var(--ok)] hover:bg-[var(--bg)]"
              >
                <span>📞</span> Call Blood Bank Desk ({data.bloodbank_phone})
              </a>
            )}
          </div>

          {/* Share Tracking Link */}
          <div className="card space-y-2.5 p-5 bg-[var(--sf)]">
            <div className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
              Share Tracking Link
            </div>
            <p className="text-[11px] text-[var(--mu)]">
              Send this live link to patient family or hospital coordinators:
            </p>
            <button
              type="button"
              onClick={handleCopyLink}
              className="btn2 w-full min-h-[40px] text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <span>📋</span> {copied ? "✓ Copied to Clipboard!" : "Copy Live Tracking Link"}
            </button>
          </div>

          {/* Refresh Footer */}
          <div className="text-center text-[11px] text-[var(--mu)] pt-1">
            Edge-cached • Synced: {lastRefreshed.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
