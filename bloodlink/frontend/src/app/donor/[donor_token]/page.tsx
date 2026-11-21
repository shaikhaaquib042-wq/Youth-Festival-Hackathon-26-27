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
      <div className="card space-y-3 text-center py-16 bg-[var(--sf)] max-w-xl mx-auto">
        <div className="text-4xl" aria-hidden="true">🗑️</div>
        <h2 className="text-lg font-bold text-[var(--ink)]">Data Permanently Deleted</h2>
        <p className="text-xs text-[var(--mu)] leading-relaxed max-w-sm mx-auto">
          In compliance with the DPDP Act 2023, your personal details, phone number, and history have been wiped from active tables.
        </p>
        <Link href="/" className="btn2 inline-block text-xs font-semibold px-5 py-2.5 mt-3">
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
    <div className="space-y-6 pb-12">
      <AppHeader
        title={`Donor Portal: ${profile?.full_name || "Voluntary Donor"}`}
        subtitle={`Locality: ${profile?.locality || "Pune"} • Capability Link`}
        bloodGroup={profile?.blood_group}
        badge={profile?.is_available ? "🟢 Available" : "⏸️ Paused"}
        badgeType={profile?.is_available ? "ok" : "default"}
        backHref="/"
        backLabel="Home"
      />

      {error && (
        <div className="p-4 bg-[var(--tint)] text-[var(--rt)] rounded-2xl text-xs font-medium border border-[var(--ln)]">
          ⚠️ {error}
        </div>
      )}

      {/* 2-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 Cols on Desktop): Active Wave Alerts & Commitments */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Active Wave Alerts (Pinged) */}
          {pingedAlerts.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">🚨</span>
                <h2 className="text-xs font-bold text-[var(--rt)] uppercase tracking-wider">
                  Emergency Wave Alerts In Your Radius ({pingedAlerts.length})
                </h2>
              </div>

              {pingedAlerts.map((alert: any) => (
                <div
                  key={alert.wave_id}
                  className="card border-2 border-[var(--rt)]/40 space-y-4 bg-[var(--sf)] p-6 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold text-[var(--ok)] flex items-center gap-1">
                        <span>🛡️</span> Verified Hospital Requisition
                      </div>
                      <h3 className="font-bold text-base text-[var(--ink)] mt-0.5">{alert.hospital_name}</h3>
                      {alert.hospital_address && (
                        <p className="text-xs text-[var(--mu)] mt-0.5">{alert.hospital_address}</p>
                      )}
                    </div>
                    <span className="font-mono font-bold text-xs bg-[var(--tint)] text-[var(--rt)] px-3 py-1.5 rounded-xl flex-none">
                      {alert.distance_km} km away
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[var(--bg)] p-3 rounded-xl border border-[var(--ln)]">
                      <span className="text-[10px] text-[var(--mu)] uppercase font-semibold block">Component</span>
                      <strong className="font-mono text-[var(--ink)] text-sm">{alert.blood_group} {alert.component}</strong>
                    </div>
                    <div className="bg-[var(--bg)] p-3 rounded-xl border border-[var(--ln)] flex flex-col justify-between">
                      <span className="text-[10px] text-[var(--mu)] uppercase font-semibold block">Urgency</span>
                      <UrgencyBadge urgency={alert.urgency} />
                    </div>
                  </div>

                  {/* Self-Check Before You Travel */}
                  <div className="bg-[var(--bg)] p-3.5 rounded-2xl space-y-2 text-xs text-[var(--ink)] border border-[var(--ln)]">
                    <div className="font-semibold text-[var(--mu)] uppercase text-[10px] tracking-wider">
                      Self-Check Before Committing:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[var(--ok)] font-bold">✓</span> Eaten in last 4 hrs
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[var(--ok)] font-bold">✓</span> Feeling healthy
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[var(--ok)] font-bold">✓</span> 90d/120d gap clear
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRespond(alert.wave_id, "snooze")}
                      className="btn2 w-full min-h-[48px] text-xs font-semibold active:scale-[0.98]"
                    >
                      Snooze / Pass
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRespond(alert.wave_id, "accept")}
                      className="btn w-full min-h-[48px] text-xs font-semibold active:scale-[0.98] shadow-sm"
                    >
                      Accept &amp; Commit →
                    </button>
                  </div>

                  {alert.google_maps_url && (
                    <div className="text-center pt-1 border-t border-[var(--ln)]">
                      <a
                        href={alert.google_maps_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[var(--ok)] hover:underline inline-flex items-center gap-1"
                      >
                        Navigate to Hospital in Google Maps ↗
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Idle Notice */
            <div className="card p-8 text-center bg-[var(--sf)] space-y-2 border-dashed">
              <div className="text-3xl" aria-hidden="true">🕊️</div>
              <h3 className="font-bold text-sm text-[var(--ink)]">No Urgent Wave Pings Right Now</h3>
              <p className="text-xs text-[var(--mu)] max-w-md mx-auto leading-relaxed">
                You are registered for <strong>{profile?.locality}</strong>. When a verified Pune hospital requests <strong>{profile?.blood_group}</strong> blood in your wave radius, you will receive an instant private alert.
              </p>
            </div>
          )}

          {/* 2. Confirmed In-Transit State */}
          {acceptedAlerts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">⏱️</span>
                <h2 className="text-xs font-bold text-[var(--ok)] uppercase tracking-wider">
                  Confirmed Commitments — Head to Blood Centre
                </h2>
              </div>

              {acceptedAlerts.map((alert: any) => (
                <div
                  key={alert.wave_id}
                  className="card border-2 border-[var(--ok)]/40 space-y-4 bg-[var(--okt)]/20 p-6 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-base text-[var(--ink)]">{alert.hospital_name}</h3>
                      <p className="text-xs text-[var(--mu)] mt-0.5">{alert.hospital_address}</p>
                    </div>
                    <CountdownTimer deadline={alert.arrival_deadline} label="Arrival Deadline" size="lg" />
                  </div>

                  <div className="p-3.5 bg-[var(--sf)] rounded-2xl border border-[var(--ln)] text-xs space-y-1">
                    <div className="font-semibold text-[var(--ink)]">On-Site Instructions:</div>
                    <p className="text-[11px] text-[var(--mu)] leading-relaxed">
                      Head to the Hospital Blood Bank / Transfusion Centre. Mention the patient requisition reference.
                    </p>
                    {alert.hospital_phone && (
                      <a href={`tel:${alert.hospital_phone}`} className="text-[var(--ok)] font-semibold block text-xs pt-1">
                        📞 Blood Bank Desk: {alert.hospital_phone}
                      </a>
                    )}
                  </div>

                  {alert.google_maps_url && (
                    <a
                      href={alert.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn w-full min-h-[46px] text-center text-xs block font-semibold active:scale-[0.98]"
                    >
                      Start Google Maps Navigation ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (5 Cols on Desktop): Sticky Profile & Availability Sidebar */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <div className="card space-y-5 p-5 sm:p-6 bg-[var(--sf)]">
            <div className="flex items-center justify-between border-b border-[var(--ln)] pb-3">
              <span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                Voluntary Donor Status
              </span>
              <span className="tg ok font-mono text-[10px]">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[var(--ink)]">{profile?.full_name}</h3>
                <p className="text-xs text-[var(--mu)] mt-0.5">Locality: {profile?.locality}</p>
              </div>
              <div className="bg-badge w-14 h-14 text-lg shadow-sm">
                {profile?.blood_group}
              </div>
            </div>

            {/* Availability Toggle */}
            <div className="p-4 bg-[var(--bg)] rounded-2xl border border-[var(--ln)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-[var(--ink)]">
                  {profile?.is_available ? "🟢 Ready for Waves" : "⏸️ Alerts Paused"}
                </div>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleToggleAvailability}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] ${
                    profile?.is_available
                      ? "btn2 min-h-[38px] bg-[var(--sf)]"
                      : "btn min-h-[38px]"
                  }`}
                >
                  {profile?.is_available ? "Pause Alerts" : "Resume Alerts"}
                </button>
              </div>
              <p className="text-[11px] text-[var(--mu)] leading-relaxed">
                {profile?.is_available
                  ? "You will receive targeted WhatsApp alerts when nearby Pune hospitals need your blood group."
                  : "You will not receive any wave notification pings while paused."}
              </p>
            </div>

            {/* NBTC Cooldown Card */}
            {profile?.is_on_cooldown ? (
              <div className="p-4 bg-[#FEF3C7] rounded-2xl border border-[#D97706]/30 space-y-1.5">
                <div className="text-xs font-bold text-[#92400E] flex items-center gap-1.5">
                  <span>⏳</span> NBTC Cooldown Active ({profile?.cooldown_days_left} days left)
                </div>
                <p className="text-[11px] text-[#92400E]/90 leading-relaxed">
                  Next eligible donation date:{" "}
                  <strong>{new Date(profile?.cooldown_until).toLocaleDateString()}</strong>.
                  Wave matching will automatically resume once the health cooldown expires.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-[var(--okt)]/40 rounded-2xl border border-[var(--ok)]/20 space-y-1">
                <div className="text-xs font-bold text-[var(--ok)] flex items-center gap-1">
                  <span>✓</span> Medically Eligible
                </div>
                <p className="text-[11px] text-[var(--mu)] leading-relaxed">
                  No active NBTC cooldown. You are eligible for emergency matching waves.
                </p>
              </div>
            )}

            {/* DPDP Deletion */}
            <div className="pt-3 border-t border-[var(--ln)] flex items-center justify-between text-xs">
              <Link href="/privacy" className="text-[var(--mu)] hover:underline">
                DPDP Notice
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
      </div>
    </div>
  );
}
