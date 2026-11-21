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
      "Confirm permanent deletion of your voluntary donor profile under DPDP Act rights?"
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
        <h2 className="text-base font-bold text-[var(--ink)]">Data Permanently Deleted</h2>
        <p className="text-xs text-[var(--mu)] leading-relaxed max-w-sm mx-auto">
          Under DPDP Act compliance, your registration and records have been deleted from active tables.
        </p>
        <Link href="/request" className="btn2 inline-block text-xs font-semibold px-5 py-2.5 mt-3">
          Return to Intake Portal
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-24 text-center space-y-2">
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
        subtitle={`Locality: ${profile?.locality || "Pune"} • Capability Token`}
        bloodGroup={profile?.blood_group}
        badge={profile?.is_available ? "Available" : "Paused"}
        badgeType={profile?.is_available ? "ok" : "default"}
      />

      {error && (
        <div className="p-4 bg-[var(--tint)] text-[var(--rt)] rounded-xl text-xs font-medium border border-[var(--ln)]">
          {error}
        </div>
      )}

      {/* 2-Column Desktop Grid per PRD Section 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Dual-State View: 1. Active Alert State */}
        <div className="lg:col-span-7 space-y-6">
          {pingedAlerts.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-[var(--rt)] uppercase tracking-wider">
                Active Wave Alert ({pingedAlerts.length})
              </h2>

              {pingedAlerts.map((alert: any) => (
                <div
                  key={alert.wave_id}
                  className="card border-2 border-[var(--rt)]/40 space-y-4 bg-[var(--sf)] p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {/* Verified Hospital Seal */}
                      <span className="tg ok text-[10px] uppercase font-bold">
                        Verified Hospital Seal
                      </span>
                      {/* Hospital Name */}
                      <h3 className="font-bold text-base text-[var(--ink)] mt-1">{alert.hospital_name}</h3>
                      {/* Google Maps link */}
                      {alert.google_maps_url && (
                        <a
                          href={alert.google_maps_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-[var(--ok)] hover:underline inline-block mt-0.5"
                        >
                          Google Maps Link
                        </a>
                      )}
                    </div>
                    {/* Exact distance */}
                    <span className="font-mono font-bold text-xs bg-[var(--tint)] text-[var(--rt)] px-3 py-1.5 rounded-lg flex-none">
                      {alert.distance_km} km away
                    </span>
                  </div>

                  {/* Blood Group & Component needed */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[var(--bg)] p-3 rounded-lg border border-[var(--ln)]">
                      <span className="text-[10px] text-[var(--mu)] uppercase font-semibold block">Blood Group &amp; Component</span>
                      <strong className="font-mono text-[var(--ink)] text-sm">{alert.blood_group} {alert.component}</strong>
                    </div>
                    {/* Calm factual urgency tag */}
                    <div className="bg-[var(--bg)] p-3 rounded-lg border border-[var(--ln)] flex flex-col justify-between">
                      <span className="text-[10px] text-[var(--mu)] uppercase font-semibold block">Urgency</span>
                      <UrgencyBadge urgency={alert.urgency} />
                    </div>
                  </div>

                  {/* Self-Check Before You Travel checklist (PRD Section 3) */}
                  <div className="bg-[var(--bg)] p-3.5 rounded-xl space-y-1.5 text-xs text-[var(--ink)] border border-[var(--ln)]">
                    <div className="font-semibold text-[var(--mu)] uppercase text-[10px] tracking-wider">
                      Self-Check Before You Travel:
                    </div>
                    <div className="text-[11px] space-y-1">
                      <div>• Eaten in last 4 hrs</div>
                      <div>• Feeling well</div>
                      <div>• 90/120+ days gap</div>
                    </div>
                  </div>

                  {/* One-tap Accept & Commit or Snooze / Pass buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRespond(alert.wave_id, "snooze")}
                      className="btn2 w-full min-h-[48px] text-xs font-semibold"
                    >
                      Snooze / Pass
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRespond(alert.wave_id, "accept")}
                      className="btn w-full min-h-[48px] text-xs font-semibold"
                    >
                      Accept &amp; Commit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center bg-[var(--sf)] space-y-2">
              <h3 className="font-bold text-sm text-[var(--ink)]">No Active Wave Pings</h3>
              <p className="text-xs text-[var(--mu)] max-w-md mx-auto leading-relaxed">
                Your profile is active for <strong>{profile?.locality}</strong>. You will be alerted when a verified hospital within your wave radius submits an approved requisition.
              </p>
            </div>
          )}

          {/* Accepted State Commitments */}
          {acceptedAlerts.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-[var(--ok)] uppercase tracking-wider">
                Committed Donation
              </h2>

              {acceptedAlerts.map((alert: any) => (
                <div
                  key={alert.wave_id}
                  className="card border-2 border-[var(--ok)]/40 space-y-4 bg-[var(--okt)]/20 p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-base text-[var(--ink)]">{alert.hospital_name}</h3>
                      <p className="text-xs text-[var(--mu)] mt-0.5">{alert.hospital_address}</p>
                    </div>
                    <CountdownTimer deadline={alert.arrival_deadline} label="Arrival Deadline" size="lg" />
                  </div>

                  <div className="p-3 bg-[var(--sf)] rounded-xl border border-[var(--ln)] text-xs space-y-1">
                    <div className="font-semibold text-[var(--ink)]">On-Site Instructions:</div>
                    <p className="text-[11px] text-[var(--mu)] leading-relaxed">
                      Report to the hospital blood bank desk. State the patient reference.
                    </p>
                  </div>

                  {alert.google_maps_url && (
                    <a
                      href={alert.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn w-full min-h-[46px] text-center text-xs block font-semibold"
                    >
                      Google Maps Navigation
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Dual-State View: 2. Idle / Profile State (PRD Section 3) */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
          <div className="card space-y-5 p-6 bg-[var(--sf)]">
            <div className="flex items-center justify-between border-b border-[var(--ln)] pb-3">
              <span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                Donor Profile State
              </span>
              <span className="tg ok font-mono text-[10px]">
                Registered
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[var(--ink)]">{profile?.full_name}</h3>
                <p className="text-xs text-[var(--mu)] mt-0.5">Locality: {profile?.locality}</p>
              </div>
              <div className="bg-badge w-12 h-12 text-base">
                {profile?.blood_group}
              </div>
            </div>

            {/* One-tap Available / Paused toggle (PRD Section 3) */}
            <div className="p-4 bg-[var(--bg)] rounded-xl border border-[var(--ln)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--ink)]">
                  Status: {profile?.is_available ? "Available" : "Paused"}
                </span>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleToggleAvailability}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    profile?.is_available
                      ? "btn2 min-h-[38px] bg-[var(--sf)]"
                      : "btn min-h-[38px]"
                  }`}
                >
                  {profile?.is_available ? "Pause Alerts" : "Resume Alerts"}
                </button>
              </div>
              <p className="text-[11px] text-[var(--mu)]">
                One-tap toggle to pause incoming notification wave alerts.
              </p>
            </div>

            {/* Live countdown timer if on NBTC cooldown (PRD Section 3) */}
            {profile?.is_on_cooldown ? (
              <div className="p-4 bg-[#FEF3C7] rounded-xl border border-[#92400E]/20 space-y-1">
                <div className="text-xs font-bold text-[#92400E]">
                  NBTC Cooldown Active ({profile?.cooldown_days_left} days remaining)
                </div>
                <p className="text-[11px] text-[#92400E]/90 leading-relaxed">
                  Next eligible donation date:{" "}
                  <strong>{new Date(profile?.cooldown_until).toLocaleDateString()}</strong>.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-[var(--okt)]/30 rounded-xl border border-[var(--ok)]/20 text-xs">
                <span className="font-bold text-[var(--ok)] block">Eligible for Wave Matching</span>
                <span className="text-[11px] text-[var(--mu)]">No active NBTC cooldown.</span>
              </div>
            )}

            {/* Delete My Data button (PRD Section 3) */}
            <div className="pt-3 border-t border-[var(--ln)]">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleDeleteData}
                className="btn2 w-full text-xs font-semibold text-[var(--rt)] border-[var(--rt)]/40 hover:bg-[var(--tint)]"
              >
                Delete My Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
