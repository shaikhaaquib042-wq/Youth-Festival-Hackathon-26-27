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
        <p className="text-xs text-[var(--mu)] font-medium">Loading requisition live tracking board...</p>
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
        title={`Live Status Board: ${data?.hospital_name || "Requisition"}`}
        subtitle={`Request ID: ${requestId} • 15s HTTP polling`}
        bloodGroup={data?.blood_group}
        badge={
          isPending
            ? "Pending Hospital Sign-Off"
            : isActive
            ? "Verified Active"
            : isFulfilled
            ? "Fulfilled"
            : "Expired"
        }
        badgeType={isActive || isFulfilled ? "ok" : "default"}
      />

      {/* 2-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols): Status & Waves */}
        <div className="lg:col-span-7 space-y-5">
          {/* Verification Badge */}
          <div className="card space-y-2 p-5 bg-[var(--sf)] border-l-4 border-l-[#C62828]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--mu)] uppercase tracking-wider">
                Verification Status
              </span>
              <UrgencyBadge urgency={data?.urgency || "CRITICAL"} />
            </div>

            <div className="font-mono font-bold text-base text-[var(--ink)]">
              {isPending && "Pending Hospital Sign-Off"}
              {isActive && "Verified Active"}
              {isFulfilled && "Fulfilled"}
              {isExpired && "Expired"}
            </div>
          </div>

          {/* Active Wave Counter (PRD Section 3) */}
          {isActive && (
            <div className="card space-y-4 p-5 bg-[var(--sf)]">
              <div className="flex items-center justify-between border-b border-[var(--ln)] pb-3">
                <h2 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                  Active Wave Counter
                </h2>
                <span className="text-xs text-[var(--mu)] font-mono">
                  Current Wave: {data?.current_wave || 1}
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
                        className="p-3 bg-[var(--bg)] rounded-xl border border-[var(--ln)] flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-[var(--ink)]">
                            Wave {waveNum}: {w.total} donors alerted within {w.radius_km || 3} km
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
                  Wave 1: Alerting nearby donors within 3 km.
                </div>
              )}

              {/* Accepted Donor Count & Arrival Countdown (PRD Section 3) */}
              {activeArrivals.length > 0 && (
                <div className="space-y-2.5 pt-3 border-t border-[var(--ln)]">
                  <div className="text-xs font-bold text-[var(--ok)]">
                    Accepted Donor Count &amp; Arrival Countdown ({activeArrivals.length}):
                  </div>
                  {activeArrivals.map((arr: any, i: number) => (
                    <div
                      key={i}
                      className="p-3 bg-[var(--okt)]/30 border border-[var(--ln)] rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-[var(--ink)]">Accepted Donor #{i + 1}</div>
                        <div className="text-[var(--mu)] font-mono">{arr.distance_km} km away</div>
                      </div>
                      <CountdownTimer deadline={arr.arrival_deadline} label="Arrival Countdown" size="md" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* e-RaktKosh Parallel Stock-Check Link (PRD Section 3) */}
          <div className="card bg-[var(--tint)] border-[var(--ln)] space-y-2.5 p-5">
            <h3 className="text-xs font-bold text-[var(--rt)] uppercase tracking-wider">
              e-RaktKosh Parallel Stock-Check Link
            </h3>
            <p className="text-xs text-[var(--mu)] leading-relaxed">
              Check live inventory across Pune blood centres in parallel during critical needs:
            </p>
            <a
              href={data?.eraktkosh_url || "https://www.eraktkosh.in"}
              target="_blank"
              rel="noreferrer"
              className="btn2 w-full min-h-[44px] text-xs font-semibold text-center flex items-center justify-center bg-[var(--sf)] hover:bg-[var(--bg)]"
            >
              Check Live Inventory on e-RaktKosh
            </a>
          </div>
        </div>

        {/* Right Column (5 cols): Hospital blood bank desk contact & Summary */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
          {/* Hospital Blood Bank Desk Contact (PRD Section 3) */}
          <div className="card space-y-3 p-5 bg-[var(--sf)]">
            <h3 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
              Hospital Blood Bank Desk Contact
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
                className="btn2 w-full min-h-[44px] text-xs font-semibold flex items-center justify-center text-[var(--ok)] hover:bg-[var(--bg)]"
              >
                Call Desk: {data.bloodbank_phone}
              </a>
            )}
          </div>

          {/* Units Progress */}
          <div className="card space-y-3 p-5 bg-[var(--sf)]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--ink)] uppercase tracking-wider">Units Fulfillment</span>
              <span className="font-mono font-bold text-[var(--ok)]">
                {data?.units_accepted} of {data?.units_needed} Units Accepted
              </span>
            </div>

            <div className="bar" role="progressbar" aria-valuenow={percentComplete} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${percentComplete}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
              <div className="bg-[var(--bg)] p-2 rounded-lg border border-[var(--ln)]">
                <span className="text-[10px] text-[var(--mu)] uppercase block">Blood Group</span>
                <span className="font-mono font-extrabold text-lg text-[var(--rt)]">{data?.blood_group}</span>
              </div>
              <div className="bg-[var(--bg)] p-2 rounded-lg border border-[var(--ln)]">
                <span className="text-[10px] text-[var(--mu)] uppercase block">Component</span>
                <span className="font-bold text-xs text-[var(--ink)] block mt-1 truncate">{data?.component}</span>
              </div>
            </div>
          </div>

          {/* Tracking Link Copy */}
          <div className="card space-y-2 p-4 bg-[var(--sf)]">
            <span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider block">
              Tracking Link
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="btn2 w-full min-h-[40px] text-xs font-semibold flex items-center justify-center"
            >
              {copied ? "Link Copied" : "Copy Tracking Link"}
            </button>
          </div>

          <div className="text-center text-[11px] text-[var(--mu)]">
            HTTP Polling 15s • Last Synced: {lastRefreshed.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
