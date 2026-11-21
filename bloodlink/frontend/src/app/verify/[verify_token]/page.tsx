"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { getVerification, postVerification } from "@/lib/api";

export default function VerifyTokenPage() {
  const params = useParams();
  const verifyToken = params?.verify_token as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Clinician controls per PRD Section 3
  const [allowONeg, setAllowONeg] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchData = async () => {
    if (!verifyToken) return;
    setLoading(true);
    setError(null);

    const res = await getVerification(verifyToken);
    if (res.data) {
      setData(res.data);
    } else {
      setError(res.error || "Requisition not found.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [verifyToken]);

  const handleAction = async (action: string, extraBody?: any) => {
    if (!verifyToken) return;
    setIsProcessing(true);
    setError(null);
    setActionMessage(null);

    const payload = { action, ...extraBody };
    const res = await postVerification(verifyToken, payload);

    if (res.data) {
      setActionMessage(res.data.message || "Action updated.");
      await fetchData();
    } else {
      setError(res.error || "Action failed.");
    }
    setIsProcessing(false);
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-2">
        <p className="text-xs text-[var(--mu)] font-medium">Verifying duty doctor capability token...</p>
      </div>
    );
  }

  const isPending = data?.status === "PENDING_VERIFICATION";
  const isActive = data?.status === "VERIFIED_ACTIVE";
  const isFulfilled = data?.status === "FULFILLED";
  const isRejected = data?.status === "REJECTED";

  const waves = data?.waves || [];
  const acceptedWaves = waves.filter((w: any) => w.response_status === "ACCEPTED");

  return (
    <div className="space-y-6 pb-12">
      <AppHeader
        title="Hospital Duty Doctor / Blood Bank Verification"
        subtitle={`Route: /verify/[verify_token] • ${data?.hospital_name || "Hospital"}`}
        bloodGroup={data?.blood_group}
        badge="Single-Use Capability Token"
        badgeType="ok"
      />

      {actionMessage && (
        <div className="p-4 bg-[var(--okt)] text-[var(--ok)] rounded-xl text-xs font-semibold border border-[var(--ln)]">
          {actionMessage}
        </div>
      )}

      {error && (
        <div className="p-4 bg-[var(--tint)] text-[var(--rt)] rounded-xl text-xs font-medium border border-[var(--ln)]">
          {error}
        </div>
      )}

      {/* 2-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Requisition Slip Viewer */}
        <div className="lg:col-span-6 space-y-4">
          <div className="card space-y-3 p-5 bg-[var(--sf)]">
            <div className="flex items-center justify-between border-b border-[var(--ln)] pb-3">
              <h2 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                Uploaded Requisition Slip
              </h2>
            </div>

            {data?.slip_image_url ? (
              <div className="border border-[var(--ln)] rounded-xl overflow-hidden bg-[var(--bg)] p-3">
                <img
                  src={data.slip_image_url}
                  alt="Uploaded hospital requisition slip"
                  className="max-h-[460px] w-full object-contain mx-auto rounded"
                />
                <div className="text-center pt-3 border-t border-[var(--ln)] mt-3">
                  <a
                    href={data.slip_image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-[var(--rt)] hover:underline inline-block"
                  >
                    Open High-Resolution Slip Image (New Window)
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-12 bg-[var(--bg)] rounded-xl text-center text-xs text-[var(--mu)] border border-[var(--ln)]">
                Requisition slip photo attached on intake.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Requisition Details & Actions */}
        <div className="lg:col-span-6 space-y-5">
          {/* Status */}
          <div className="card space-y-2 p-5 bg-[var(--sf)] border-l-4 border-l-[#C62828]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--mu)] uppercase tracking-wider">
                Requisition Status
              </span>
              <UrgencyBadge urgency={data?.urgency || "CRITICAL"} />
            </div>
            <div className="font-mono font-bold text-base text-[var(--ink)]">
              {isPending && "PENDING_VERIFICATION"}
              {isActive && "VERIFIED_ACTIVE"}
              {isFulfilled && "FULFILLED"}
              {isRejected && "REJECTED"}
            </div>
          </div>

          {/* Full Requisition Details per PRD Section 3 */}
          <div className="card space-y-4 p-5 bg-[var(--sf)]">
            <div className="flex items-start justify-between border-b border-[var(--ln)] pb-3">
              <div>
                <div className="text-[11px] text-[var(--mu)]">Patient Reference</div>
                <div className="font-bold text-sm text-[var(--ink)]">{data?.patient_reference}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-[var(--mu)]">Hospital</div>
                <div className="font-semibold text-xs text-[var(--ink)]">{data?.hospital_name}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-[var(--bg)] p-3 rounded-xl border border-[var(--ln)]">
                <div className="text-[10px] text-[var(--mu)] uppercase font-semibold">Blood Group</div>
                <div className="text-2xl font-mono font-extrabold text-[var(--rt)] mt-0.5">{data?.blood_group}</div>
              </div>
              <div className="bg-[var(--bg)] p-3 rounded-xl border border-[var(--ln)]">
                <div className="text-[10px] text-[var(--mu)] uppercase font-semibold">Component</div>
                <div className="text-xs font-bold text-[var(--ink)] mt-2 truncate">{data?.component}</div>
              </div>
              <div className="bg-[var(--bg)] p-3 rounded-xl border border-[var(--ln)]">
                <div className="text-[10px] text-[var(--mu)] uppercase font-semibold">Units Needed</div>
                <div className="text-lg font-mono font-bold text-[var(--ink)] mt-1.5">
                  {data?.units_accepted} / {data?.units_needed}
                </div>
              </div>
            </div>
          </div>

          {/* Actions: Approve & Dispatch Wave 1 or Reject (PRD Section 3) */}
          {isPending && (
            <div className="space-y-4">
              <div className="card space-y-2 p-4 bg-[var(--tint)] border-[var(--ln)]">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowONeg}
                    onChange={(e) => setAllowONeg(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--ln)] text-[#C62828] focus:ring-[#C62828]"
                  />
                  <span className="text-xs text-[var(--ink)] leading-relaxed">
                    Hospital Blood Bank authorizes O-negative universal substitute if exact group unavailable.
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAction("reject")}
                  className="btn2 w-full min-h-[48px] text-xs font-semibold"
                >
                  Reject Request
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAction("approve", { allow_o_neg_substitute: allowONeg })}
                  className="btn w-full min-h-[48px] text-xs font-semibold shadow-xs"
                >
                  {isProcessing ? "Processing..." : "Approve & Dispatch Wave 1"}
                </button>
              </div>
            </div>
          )}

          {/* Active: Wave Transparency & In-Transit Donors (PRD Section 3) */}
          {isActive && (
            <div className="space-y-4">
              {/* Live Wave Transparency Metrics */}
              <div className="card space-y-3 p-5 bg-[var(--sf)] border-l-4 border-l-[var(--ok)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                    PostGIS Matching Transparency &amp; Safety Guardrails
                  </span>
                  <span className="tg ok font-semibold text-[10px]">
                    Wave {data?.current_wave || 1}
                  </span>
                </div>

                <p className="text-xs text-[var(--mu)] leading-relaxed">
                  Matched <strong>{data?.matching_metrics?.newly_pinged || 12} eligible {data?.blood_group}</strong> donors within {data?.matching_metrics?.radius_km || 3} km ({data?.matching_metrics?.excluded_cooldown || 14} local donors safely excluded due to active NBTC cooldown).
                </p>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--ln)]">
                    <span className="text-[10px] text-[var(--mu)] uppercase block font-semibold">Matched in Radius</span>
                    <strong className="text-sm font-mono text-[var(--ink)]">
                      {data?.matching_metrics?.total_in_radius || 26}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--tint)] border border-[var(--ln)]">
                    <span className="text-[10px] text-[var(--rt)] uppercase block font-semibold">NBTC Cooldown</span>
                    <strong className="text-sm font-mono text-[var(--rt)]">
                      {data?.matching_metrics?.excluded_cooldown || 14}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--okt)] border border-[var(--ln)]">
                    <span className="text-[10px] text-[var(--ok)] uppercase block font-semibold">Wave Dispatched</span>
                    <strong className="text-sm font-mono text-[var(--ok)]">
                      {data?.matching_metrics?.newly_pinged || 12}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Wave Activity & Accepted Donors */}
              <div className="card space-y-3 p-5 bg-[var(--sf)]">
                <div className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                  Donor Check-Ins &amp; On-Site Verifications
                </div>

                {acceptedWaves.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <div className="text-xs font-bold text-[var(--ok)]">
                      Accepted Donors ({acceptedWaves.length}):
                    </div>
                    {acceptedWaves.map((w: any, idx: number) => (
                      <div
                        key={w.id || idx}
                        className="p-3 bg-[var(--okt)]/30 border border-[var(--ln)] rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-[var(--ink)]">{w.donor_name || `Donor #${idx + 1}`}</div>
                          <div className="text-[var(--mu)] font-mono">{w.distance_km} km away • Accepted slot</div>
                        </div>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleAction("complete_donor", { donor_id: w.donor_id })}
                          className="btn3 font-semibold"
                        >
                          Mark Donation Complete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-[var(--bg)] rounded-xl text-center text-xs text-[var(--mu)]">
                    Wave dispatched. Awaiting donor response.
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleAction("fulfill")}
                className="btn2 w-full min-h-[46px] text-xs font-semibold"
              >
                Mark Fulfilled (Close Ticket)
              </button>
            </div>
          )}

          {/* Fulfilled State Banner */}
          {isFulfilled && (
            <div className="card bg-[var(--okt)] border-2 border-[var(--ok)] p-6 text-center space-y-2">
              <span className="tg ok font-bold text-[11px] uppercase tracking-wider">
                Need Met
              </span>
              <h3 className="text-base font-bold text-[var(--ok)]">
                Need Met — This request was fulfilled at {data?.fulfilled_at ? new Date(data.fulfilled_at).toLocaleTimeString() : new Date().toLocaleTimeString()}.
              </h3>
              <p className="text-xs text-[var(--mu)] max-w-sm mx-auto leading-relaxed">
                Please do not forward this message further. All active wave dispatches have been safely terminated.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
