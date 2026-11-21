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

  // Clinician controls
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
      setActionMessage(res.data.message || "Action executed successfully.");
      await fetchData();
    } else {
      setError(res.error || "Action could not be executed.");
    }
    setIsProcessing(false);
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-2">
        <div className="text-3xl animate-pulse">🏥</div>
        <p className="text-xs text-[var(--mu)] font-medium">Verifying clinician token...</p>
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
        title="Duty Doctor Sign-Off &amp; Wave Dispatch"
        subtitle={`Hospital: ${data?.hospital_name || "Pune Hospital"} • Clinical Portal`}
        bloodGroup={data?.blood_group}
        badge="🛡️ Official Verifier"
        badgeType="ok"
        backHref="/"
        backLabel="Home"
      />

      {actionMessage && (
        <div className="p-4 bg-[var(--okt)] text-[var(--ok)] rounded-2xl text-xs font-semibold border border-[var(--ln)]">
          ✓ {actionMessage}
        </div>
      )}

      {error && (
        <div className="p-4 bg-[var(--tint)] text-[var(--rt)] rounded-2xl text-xs font-medium border border-[var(--ln)]">
          ⚠️ {error}
        </div>
      )}

      {/* 2-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (6 Cols on Desktop): High-Res Slip Viewer */}
        <div className="lg:col-span-6 space-y-4">
          <div className="card space-y-3 p-5 sm:p-6 bg-[var(--sf)]">
            <div className="flex items-center justify-between border-b border-[var(--ln)] pb-3">
              <h2 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                Official Requisition Slip
              </h2>
              <span className="text-[11px] text-[var(--mu)]">Client-side WebP</span>
            </div>

            {data?.slip_image_url ? (
              <div className="border border-[var(--ln)] rounded-2xl overflow-hidden bg-[var(--bg)] p-3">
                <img
                  src={data.slip_image_url}
                  alt="Official Requisition Slip"
                  className="max-h-[460px] w-full object-contain mx-auto rounded-xl"
                />
                <div className="text-center pt-3 border-t border-[var(--ln)] mt-3">
                  <a
                    href={data.slip_image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-[var(--rt)] hover:underline inline-flex items-center gap-1"
                  >
                    Open Full High-Resolution Image In New Window ↗
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-12 bg-[var(--bg)] rounded-2xl text-center text-xs text-[var(--mu)] border border-[var(--ln)] space-y-2">
                <div className="text-3xl">📄</div>
                <div className="font-semibold text-[var(--ink)]">Official Slip Verified on Intake</div>
                <p className="max-w-xs mx-auto text-[11px]">
                  Physical slip was verified by intake staff. Digital archival copy is retained under DPDP compliance rules.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (6 Cols on Desktop): Requisition Details & Approval Controls */}
        <div className="lg:col-span-6 space-y-5">
          {/* Status Banner */}
          <div className="card space-y-1.5 p-5 bg-[var(--sf)] border-l-4 border-l-[#C62828]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--mu)] uppercase tracking-wider">
                Requisition Status
              </span>
              <UrgencyBadge urgency={data?.urgency || "CRITICAL"} />
            </div>
            <div className="font-mono font-bold text-base text-[var(--ink)]">
              {isPending && "⏳ PENDING CLINICIAN VERIFICATION"}
              {isActive && "🟢 VERIFIED ACTIVE (DISPATCHING WAVES)"}
              {isFulfilled && "✓ FULFILLED & CLOSED"}
              {isRejected && "❌ REJECTED"}
            </div>
          </div>

          {/* Requisition Clinical Details */}
          <div className="card space-y-4 p-5 sm:p-6 bg-[var(--sf)]">
            <div className="flex items-start justify-between border-b border-[var(--ln)] pb-3">
              <div>
                <div className="text-[11px] text-[var(--mu)]">Patient Identifier</div>
                <div className="font-bold text-base text-[var(--ink)]">{data?.patient_reference}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-[var(--mu)]">Accredited Blood Centre</div>
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

          {/* Decision Actions for Duty Doctor */}
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
                    <strong>Authorize Universal O-Negative Fallback:</strong> Check this if the hospital authorizes notifying eligible O- donors if exact {data?.blood_group} donors are depleted.
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAction("reject")}
                  className="btn2 w-full min-h-[50px] text-xs font-semibold active:scale-[0.98]"
                >
                  ✗ Reject Request
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAction("approve", { allow_o_neg_substitute: allowONeg })}
                  className="btn w-full min-h-[50px] text-xs font-semibold active:scale-[0.98] shadow-sm"
                >
                  {isProcessing ? "Processing..." : "✓ Approve & Dispatch Wave 1"}
                </button>
              </div>
            </div>
          )}

          {/* Active State View & In-Transit Donors */}
          {isActive && (
            <div className="space-y-4">
              <div className="card space-y-3 p-5 bg-[var(--sf)]">
                <div className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                  Dispatched Wave Activity
                </div>
                <div className="text-xs text-[var(--mu)]">
                  Wave {data?.current_wave || 1} active • {waves.length} nearby donors pinged via WhatsApp
                </div>

                {acceptedWaves.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-bold text-[var(--ok)]">
                      Donors Currently In Transit ({acceptedWaves.length}):
                    </div>
                    {acceptedWaves.map((w: any, idx: number) => (
                      <div
                        key={w.id || idx}
                        className="p-3 bg-[var(--okt)]/40 border border-[var(--ln)] rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-[var(--ink)]">{w.donor_name || `Donor #${idx + 1}`}</div>
                          <div className="text-[var(--mu)] font-mono">{w.distance_km} km away</div>
                        </div>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleAction("complete_donor", { donor_id: w.donor_id })}
                          className="btn3 font-semibold"
                        >
                          Mark Donated
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-[var(--bg)] rounded-xl text-center text-xs text-[var(--mu)]">
                    Awaiting first response from dispatched wave.
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleAction("fulfill")}
                className="btn2 w-full min-h-[46px] text-xs font-semibold active:scale-[0.98]"
              >
                Mark Requisition Fulfilled &amp; Lock Cooldowns
              </button>
            </div>
          )}

          {isFulfilled && (
            <div className="card bg-[var(--okt)]/40 border-[var(--ok)]/30 p-5 text-center space-y-1">
              <div className="text-2xl" aria-hidden="true">🎉</div>
              <div className="text-sm font-bold text-[var(--ok)]">Requisition Fulfilled</div>
              <p className="text-xs text-[var(--mu)]">
                Required units collected. Participating donors placed on NBTC cooldown lock.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
