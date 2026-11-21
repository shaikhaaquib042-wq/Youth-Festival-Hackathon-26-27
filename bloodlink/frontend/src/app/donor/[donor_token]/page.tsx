"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { CountdownTimer } from "@/components/CountdownTimer";
import {
  getDonorProfile,
  postDonorAction,
  deleteDonorData,
} from "@/lib/api";

export default function DonorDashboardPage() {
  const params = useParams();
  const donorToken = params?.donor_token as string;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const fetchProfile = async (showLoading = false) => {
    if (!donorToken) return;
    if (showLoading) setLoading(true);

    const res = await getDonorProfile(donorToken);
    if (res.data) {
      setProfile(res.data);
      setError(null);
    } else {
      setError(res.error || "Unable to load profile.");
    }
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    fetchProfile(true);
    const interval = setInterval(() => {
      fetchProfile(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [donorToken]);

  const handleRespond = async (waveId: string, action: "accept" | "snooze") => {
    setIsProcessing(true);
    setError(null);

    const res = await postDonorAction(donorToken, { action, wave_id: waveId });
    if (res.data?.message) {
      alert(res.data.message);
    }
    await fetchProfile(false);
    setIsProcessing(false);
  };

  const handleToggleAvailability = async () => {
    setIsProcessing(true);
    await postDonorAction(donorToken, { action: "toggle_availability" });
    await fetchProfile(false);
    setIsProcessing(false);
  };

  const handleDeleteData = async () => {
    const confirmed = window.confirm(
      "Under DPDP Act compliance, your phone number, locality, and donor registration will be permanently erased. Proceed?"
    );
    if (!confirmed) return;

    setIsProcessing(true);
    await deleteDonorData(donorToken);
    setDeleted(true);
    setIsProcessing(false);
  };

  if (deleted) {
    return (
      <div className="card space-y-3 text-center py-14">
        <div className="text-3xl" aria-hidden="true">🗑️</div>
        <h2 className="text-base font-bold text-[var(--ink)]">Data Permanently Deleted</h2>
        <p className="text-xs text-[var(--mu)] leading-relaxed max-w-xs mx-auto">
          In compliance with the DPDP Act 2023, your personal details and history have been wiped from active tables.
        </p>
        <Link href="/" className="btn2 inline-block text-xs font-semibold px-4 py-2 mt-2">
          Return to Home →
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-24 text-center space-y-2">
        <div className="text-3xl animate-pulse">🩸</div>
        <p className="text-xs text-[var(--mu)] font-medium">Loading private donor portal...</p>
      </div>
    );
  }

  const alerts = profile?.alerts || [];
  const pingedAlerts = alerts.filter((a: any) => a.response_status === "PINGED");
  const acceptedAlerts = alerts.filter((a: any) => a.response_status === "ACCEPTED");

  return (
    <div className="space-y-5 pb-8">
      <AppHeader
        title="Donor Portal"
        subtitle="Private Capability Link • Zero Public Exposure"
        bloodGroup={profile?.blood_group}
        badge={profile?.is_available ? "🟢 Ready" : "⏸️ Paused"}
        badgeType={profile?.is_available ? "ok" : "default"}
        backHref="/"
        backLabel="Home"
      />

      {error && (
        <div className="p-3 bg-[var(--tint)] text-[var(--rt)] rounded-xl text-xs font-medium border border-[var(--ln)]">
          ⚠️ {error}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. ACTIVE WAVE ALERTS (PINGED) */}
      {/* ========================================================================= */}
      {pingedAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">🚨</span>
            <h2 className="text-xs font-bold text-[var(--rt)] uppercase tracking-wider">
              Emergency Request In Your Area ({pingedAlerts.length})
            </h2>
          </div>

          {pingedAlerts.map((alert: any) => (
            <div
              key={alert.wave_id}
              className="card border-2 border-[var(--rt)]/40 space-y-3 bg-[var(--sf)] shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-[var(--ok)] flex items-center gap-1">
                    <span>🛡️</span> Verified Hospital Request
                  </div>
                  <h3 className="font-bold text-sm text-[var(--ink)] mt-0.5">{alert.hospital_name}</h3>
                  {alert.hospital_address && (
                    <p className="text-[11px] text-[var(--mu)] mt-0.5">{alert.hospital_address}</p>
                  )}
                </div>
                <span className="font-mono font-bold text-xs bg-[var(--tint)] text-[var(--rt)] px-2.5 py-1 rounded-lg">
                  {alert.distance_km} km
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[var(--bg)] p-2.5 rounded-lg border border-[var(--ln)]">
                  <span className="text-[10px] text-[var(--mu)] uppercase font-semibold block">Component</span>
                  <strong className="font-mono text-[var(--ink)] text-sm">{alert.blood_group} {alert.component}</strong>
                </div>
                <div className="bg-[var(--bg)] p-2.5 rounded-lg border border-[var(--ln)] flex flex-col justify-between">
                  <span className="text-[10px] text-[var(--mu)] uppercase font-semibold block">Urgency</span>
                  <UrgencyBadge urgency={alert.urgency} />
                </div>
              </div>

              {/* Self-Check Before You Travel */}
              <div className="bg-[var(--bg)] p-3 rounded-xl space-y-1.5 text-[11px] text-[var(--ink)] border border-[var(--ln)]">
                <div className="font-semibold text-[var(--mu)] uppercase text-[10px] tracking-wider">
                  Self-Check Before Committing:
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--ok)] font-bold">✓</span> Eaten within the last 4 hours &amp; hydrated
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--ok)] font-bold">✓</span> Feeling healthy with zero viral symptoms
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--ok)] font-bold">✓</span> NBTC cooldown expired (90d M / 120d F)
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleRespond(alert.wave_id, "snooze")}
                  className="btn2 w-full min-h-[46px] text-xs font-semibold active:scale-[0.98]"
                >
                  Snooze / Pass
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleRespond(alert.wave_id, "accept")}
                  className="btn w-full min-h-[46px] text-xs font-semibold active:scale-[0.98]"
                >
                  Accept &amp; Commit →
                </button>
              </div>

              {alert.google_maps_url && (
                <div className="text-center pt-1">
                  <a
                    href={alert.google_maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-[var(--ok)] hover:underline inline-flex items-center gap-1"
                  >
                    View Hospital Route in Google Maps ↗
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CONFIRMED IN-TRANSIT STATE */}
      {/* ========================================================================= */}
      {acceptedAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">⏱️</span>
            <h2 className="text-xs font-bold text-[var(--ok)] uppercase tracking-wider">
              Confirmed Commitment — Head to Blood Centre
            </h2>
          </div>

          {acceptedAlerts.map((alert: any) => (
            <div
              key={alert.wave_id}
              className="card border-2 border-[var(--ok)]/40 space-y-3 bg-[var(--okt)]/20 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[var(--ink)]">{alert.hospital_name}</h3>
                  <p className="text-[11px] text-[var(--mu)]">{alert.hospital_address}</p>
                </div>
                <CountdownTimer deadline={alert.arrival_deadline} label="Arrival Deadline" size="md" />
              </div>

              <div className="p-3 bg-[var(--sf)] rounded-xl border border-[var(--ln)] text-xs space-y-1">
                <div className="font-semibold text-[var(--ink)]">On-Site Instructions:</div>
                <p className="text-[11px] text-[var(--mu)] leading-relaxed">
                  Head directly to the Blood Bank / Transfusion Centre. Mention the patient requisition reference.
                </p>
                {alert.hospital_phone && (
                  <a href={`tel:${alert.hospital_phone}`} className="text-[var(--ok)] font-semibold block text-[11px] pt-1">
                    📞 Blood Bank Desk: {alert.hospital_phone}
                  </a>
                )}
              </div>

              {alert.google_maps_url && (
                <a
                  href={alert.google_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn w-full min-h-[44px] text-center text-xs block font-semibold active:scale-[0.98]"
                >
                  Start Google Maps Navigation ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PROFILE & AVAILABILITY STATE */}
      {/* ========================================================================= */}
      <div className="card space-y-4">
        <div className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
          Voluntary Donor Profile
        </div>

        <div className="flex items-center justify-between border-b border-[var(--ln)] pb-3">
          <div>
            <h3 className="font-bold text-sm text-[var(--ink)]">{profile?.full_name}</h3>
            <p className="text-xs text-[var(--mu)]">Pune Locality: {profile?.locality}</p>
          </div>
          <div className="bg-badge w-12 h-12 text-base">
            {profile?.blood_group}
          </div>
        </div>

        {/* Available / Paused Toggle */}
        <div className="flex items-center justify-between p-3 bg-[var(--bg)] rounded-xl border border-[var(--ln)]">
          <div>
            <div className="text-xs font-bold text-[var(--ink)]">
              {profile?.is_available ? "🟢 Available for Waves" : "⏸️ Wave Alerts Paused"}
            </div>
            <div className="text-[11px] text-[var(--mu)]">
              {profile?.is_available
                ? "You will be pinged when nearby Pune hospitals request blood."
                : "You will not receive any wave notification pings."}
            </div>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleToggleAvailability}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] ${
              profile?.is_available
                ? "btn2 min-h-[38px]"
                : "btn min-h-[38px]"
            }`}
          >
            {profile?.is_available ? "Pause" : "Resume"}
          </button>
        </div>

        {/* NBTC Cooldown Status */}
        {profile?.is_on_cooldown ? (
          <div className="p-3 bg-[#FEF3C7] rounded-xl border border-[#D97706]/30 space-y-1">
            <div className="text-xs font-bold text-[#92400E]">
              ⏳ NBTC Medical Cooldown Active ({profile?.cooldown_days_left} days left)
            </div>
            <p className="text-[11px] text-[#92400E]/90 leading-relaxed">
              Next eligible donation date:{" "}
              <strong>{new Date(profile?.cooldown_until).toLocaleDateString()}</strong>.
              Automated matching waves will resume once cooldown expires.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-[var(--okt)]/40 rounded-xl border border-[var(--ok)]/20">
            <div className="text-xs font-bold text-[var(--ok)]">
              ✓ Medically Eligible for Donation
            </div>
            <p className="text-[11px] text-[var(--mu)]">
              No active NBTC cooldown. Ready for local emergency matching waves.
            </p>
          </div>
        )}

        {/* DPDP Deletion */}
        <div className="pt-2 border-t border-[var(--ln)] flex items-center justify-between text-xs">
          <Link href="/privacy" className="text-[var(--mu)] hover:underline">
            DPDP Privacy Rights
          </Link>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleDeleteData}
            className="text-[var(--rt)] hover:underline font-semibold"
          >
            Delete My Data Permanently
          </button>
        </div>
      </div>
    </div>
  );
}
