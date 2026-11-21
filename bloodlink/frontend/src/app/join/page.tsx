"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { BloodGroupGrid } from "@/components/BloodGroupGrid";
import { registerDonor, PUNE_LOCALITIES, CAMPUS_COMMUNITY_OPTIONS } from "@/lib/api";

export default function JoinPage() {
  const [fullName, setFullName] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [biologicalSex, setBiologicalSex] = useState<"MALE" | "FEMALE">("MALE");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [locality, setLocality] = useState(PUNE_LOCALITIES[0]);
  const [campusOrCommunity, setCampusOrCommunity] = useState("");
  const [searchLocality, setSearchLocality] = useState("");
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [lastDonationDate, setLastDonationDate] = useState("");
  const [dpdpConsent, setDpdpConsent] = useState(false);

  // States
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    donor_token: string;
    donor_url: string;
    message: string;
  } | null>(null);

  const handleGetGps = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setIsGettingGps(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(pos.coords.latitude);
        setGpsLng(pos.coords.longitude);
        setIsGettingGps(false);
      },
      (err) => {
        setIsGettingGps(false);
        setError("Could not retrieve GPS pin. Locality dropdown will be used.");
        console.warn(err);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!whatsappPhone.trim() || whatsappPhone.length < 10) {
      setError("Valid WhatsApp phone number is required.");
      return;
    }
    if (!dpdpConsent) {
      setError("DPDP consent is required to register as a voluntary donor.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        full_name: fullName.trim(),
        whatsapp_phone: whatsappPhone.trim(),
        biological_sex: biologicalSex,
        blood_group: bloodGroup,
        locality: locality,
        campus_or_community: campusOrCommunity.trim() || undefined,
        dpdp_consent: true,
      };

      if (gpsLat && gpsLng) {
        payload.gps_lat = gpsLat;
        payload.gps_lng = gpsLng;
      }
      if (lastDonationDate) {
        payload.last_donation_date = lastDonationDate;
      }

      const res = await registerDonor(payload);

      if (res.error) {
        setError(res.error);
        setIsSubmitting(false);
      } else if (res.data?.donor_token) {
        setSuccessData({
          donor_token: res.data.donor_token,
          donor_url: res.data.donor_url,
          message: res.data.message || "Registration confirmed.",
        });
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || "Registration failed.");
      setIsSubmitting(false);
    }
  };

  const filteredLocalities = PUNE_LOCALITIES.filter((loc) =>
    loc.toLowerCase().includes(searchLocality.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <AppHeader
        title="Voluntary Donor Registration"
        subtitle="Route: /join • 30-Second Onboarding"
        bloodGroup={bloodGroup}
        badge="NBTC Cooldown Enforced"
        badgeType="ok"
      />

      {error && (
        <div
          className="p-4 bg-[var(--tint)] text-[var(--rt)] rounded-xl text-xs font-semibold border border-[var(--ln)]"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* 2-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-5">
          {successData ? (
            <div className="card space-y-4 p-6 border-[var(--ok)]/40 bg-[var(--okt)]/20">
              <div>
                <h2 className="text-base font-bold text-[var(--ok)]">Registration Confirmed</h2>
                <p className="text-xs text-[var(--mu)] mt-0.5">{successData.message}</p>
              </div>

              <div className="bg-[var(--sf)] p-4 rounded-xl border border-[var(--ln)] space-y-2">
                <div className="text-xs font-bold text-[var(--ink)]">Private Capability Token Link:</div>
                <div className="p-3 bg-[var(--bg)] rounded font-mono text-xs break-all text-[var(--ink)] border border-[var(--ln)] select-all">
                  {typeof window !== "undefined" ? window.location.origin : ""}{successData.donor_url}
                </div>
              </div>

              <Link
                href={successData.donor_url}
                className="btn w-full min-h-[48px] text-center text-xs font-semibold flex items-center justify-center shadow-xs"
              >
                Open Donor Portal →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Full Name & WhatsApp */}
              <div className="card space-y-3">
                <label className="text-xs font-semibold text-[var(--ink)]">
                  Contact Information
                </label>
                <div>
                  <span className="text-[11px] text-[var(--mu)] block mb-1">Full Name</span>
                  <input
                    type="text"
                    required
                    placeholder="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-[var(--mu)] block mb-1">WhatsApp Phone</span>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-2.5 bg-[var(--bg)] border border-[var(--ln)] rounded-lg text-xs font-mono text-[var(--mu)]">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="10-digit mobile"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                      className="w-full text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Biological Sex (sets automated NBTC cooldown) */}
              <div className="card space-y-2">
                <label className="text-xs font-semibold text-[var(--ink)]">
                  Biological Sex (Sets Automated NBTC Cooldown: 90 days Male / 120 days Female)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBiologicalSex("MALE")}
                    className={`min-h-[48px] rounded-lg text-xs font-semibold transition-all ${
                      biologicalSex === "MALE"
                        ? "bg-[var(--ink)] text-[var(--bg)] shadow-xs"
                        : "bg-[var(--sf)] border border-[var(--ln)] text-[var(--ink)] hover:bg-[var(--bg)]"
                    }`}
                  >
                    Male (90 days cooldown)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBiologicalSex("FEMALE")}
                    className={`min-h-[48px] rounded-lg text-xs font-semibold transition-all ${
                      biologicalSex === "FEMALE"
                        ? "bg-[var(--ink)] text-[var(--bg)] shadow-xs"
                        : "bg-[var(--sf)] border border-[var(--ln)] text-[var(--ink)] hover:bg-[var(--bg)]"
                    }`}
                  >
                    Female (120 days cooldown)
                  </button>
                </div>
              </div>

              {/* Blood Group */}
              <BloodGroupGrid
                value={bloodGroup}
                onChange={setBloodGroup}
                label="Blood Group"
              />

              {/* Pune Locality selector + optional GPS */}
              <div className="card space-y-2.5">
                <label className="text-xs font-semibold text-[var(--ink)]">
                  Pune Locality Selector
                </label>
                <input
                  type="text"
                  placeholder="Filter Pune areas..."
                  value={searchLocality}
                  onChange={(e) => setSearchLocality(e.target.value)}
                  className="w-full text-xs mb-1"
                />
                <select
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full text-xs font-medium cursor-pointer"
                >
                  {filteredLocalities.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleGetGps}
                  disabled={isGettingGps}
                  className="btn2 w-full min-h-[44px] text-xs font-semibold flex items-center justify-center mt-2 bg-[var(--sf)] hover:bg-[var(--bg)]"
                >
                  {isGettingGps
                    ? "Acquiring coordinates..."
                    : gpsLat && gpsLng
                    ? "GPS Coordinates Attached"
                    : "Attach Browser GPS Pin Drop (Optional)"}
                </button>
              </div>

              {/* College & Community Registry (Optional) */}
              <div className="card space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--ink)]">
                    College / Campus / Community Registry (Optional)
                  </label>
                  <span className="text-[10px] text-[var(--mu)]">Student &amp; Local Drives</span>
                </div>
                <p className="text-[11px] text-[var(--mu)] leading-relaxed">
                  Support targeted mobilization across Pune student campuses and residential clusters during seasonal lean months.
                </p>

                {/* Quick-select pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {CAMPUS_COMMUNITY_OPTIONS.map((opt) => {
                    const isSelected = campusOrCommunity === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCampusOrCommunity(isSelected ? "" : opt)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                          isSelected
                            ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] font-semibold"
                            : "bg-[var(--sf)] border-[var(--ln)] text-[var(--mu)] hover:text-[var(--ink)] hover:bg-[var(--bg)]"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  placeholder="Or enter campus/neighborhood name..."
                  value={campusOrCommunity}
                  onChange={(e) => setCampusOrCommunity(e.target.value)}
                  className="w-full text-xs font-medium mt-1"
                />
              </div>

              {/* Last Donation Date */}
              <div className="card space-y-2">
                <label className="text-xs font-semibold text-[var(--ink)]">
                  Last Donation Date (Optional)
                </label>
                <input
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  value={lastDonationDate}
                  onChange={(e) => setLastDonationDate(e.target.value)}
                  className="w-full text-xs font-mono"
                />
              </div>

              {/* DPDP Consent */}
              <div className="card space-y-2 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={dpdpConsent}
                    onChange={(e) => setDpdpConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--ln)] text-[#C62828] focus:ring-[#C62828]"
                  />
                  <span className="text-xs text-[var(--ink)] leading-relaxed">
                    I give explicit DPDP consent for BloodLink to store my name, WhatsApp phone, blood group, and locality strictly for voluntary donation wave coordination.
                  </span>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn w-full min-h-[48px] text-sm font-semibold shadow-xs"
              >
                {isSubmitting ? "Submitting..." : "Register as Voluntary Donor"}
              </button>
            </form>
          )}
        </div>

        {/* Right Column: PRD Guardrails */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <div className="card space-y-3 p-5 bg-[var(--sf)] text-xs text-[var(--mu)]">
            <h3 className="font-bold text-[var(--ink)] uppercase tracking-wider text-xs">
              PRD Compliance Specifications
            </h3>
            <p className="leading-relaxed">
              Section 1.2: Selling, renting, or publicly listing donor phone numbers is strictly prohibited. Communication is mediated via private capability tokens.
            </p>
            <p className="leading-relaxed">
              Enforces automated NBTC cooldown intervals (90 days male / 120 days female for whole blood).
            </p>
            <p className="leading-relaxed">
              Maintains DPDP consent timestamps, audit logs, and one-tap data deletion controls.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
