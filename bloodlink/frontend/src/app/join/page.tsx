"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { BloodGroupGrid } from "@/components/BloodGroupGrid";
import { registerDonor, PUNE_LOCALITIES } from "@/lib/api";

export default function JoinPage() {
  const [fullName, setFullName] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [biologicalSex, setBiologicalSex] = useState<"MALE" | "FEMALE">("MALE");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [locality, setLocality] = useState(PUNE_LOCALITIES[0]);
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
        setError("Could not retrieve GPS pin. Falling back to locality dropdown.");
        console.warn(err);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please provide your full name.");
      return;
    }
    if (!whatsappPhone.trim() || whatsappPhone.length < 10) {
      setError("Please enter a valid 10-digit WhatsApp number.");
      return;
    }
    if (!dpdpConsent) {
      setError("DPDP privacy consent is required to register as a voluntary donor.");
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
          message: res.data.message || "Registration successful!",
        });
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check connection.");
      setIsSubmitting(false);
    }
  };

  const filteredLocalities = PUNE_LOCALITIES.filter((loc) =>
    loc.toLowerCase().includes(searchLocality.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <AppHeader
        title="Join as Voluntary Blood Donor"
        subtitle="30-second registration • Privacy-first PostGIS wave matching"
        bloodGroup={bloodGroup}
        backHref="/"
        backLabel="Home"
      />

      {error && (
        <div
          className="p-4 bg-[var(--tint)] text-[var(--rt)] rounded-2xl text-xs font-semibold border border-[var(--ln)] flex items-start gap-2"
          role="alert"
        >
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* 2-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 Cols on Desktop): Form or Confirmation */}
        <div className="lg:col-span-7 space-y-5">
          {successData ? (
            <div className="card space-y-5 p-6 sm:p-8 border-[var(--ok)]/40 bg-[var(--okt)]/30">
              <div className="flex items-center gap-3">
                <span className="text-4xl" aria-hidden="true">🎉</span>
                <div>
                  <h2 className="text-base font-bold text-[var(--ok)]">Registration Confirmed</h2>
                  <p className="text-xs text-[var(--mu)]">{successData.message}</p>
                </div>
              </div>

              <div className="bg-[var(--sf)] p-4 sm:p-5 rounded-2xl border border-[var(--ln)] space-y-2.5">
                <div className="text-xs font-bold text-[var(--ink)]">Your Private Capability Link</div>
                <p className="text-xs text-[var(--mu)] leading-relaxed">
                  Bookmark this private link. You can use it anytime to pause alerts, monitor cooldown, or delete your data under DPDP rights.
                </p>
                <div className="p-3 bg-[var(--bg)] rounded-xl font-mono text-xs break-all text-[var(--ink)] border border-[var(--ln)] select-all">
                  {typeof window !== "undefined" ? window.location.origin : ""}{successData.donor_url}
                </div>
              </div>

              <Link
                href={successData.donor_url}
                className="btn w-full min-h-[50px] text-center text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
              >
                Open My Donor Dashboard →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* 1. Name & WhatsApp */}
              <div className="card space-y-3">
                <label className="text-xs font-semibold text-[var(--ink)]">
                  1. Contact Information
                </label>
                <div>
                  <span className="text-[11px] text-[var(--mu)] block mb-1">Full Name</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aditya Deshmukh"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-[var(--mu)] block mb-1">WhatsApp Mobile Number</span>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-2.5 bg-[var(--bg)] border border-[var(--ln)] rounded-xl text-xs font-mono text-[var(--mu)]">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="10-digit number"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                      className="w-full text-xs font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-[var(--mu)] mt-1">
                    Zero public directory pledge: Your number is never shown publicly or shared with commercial entities.
                  </p>
                </div>
              </div>

              {/* 2. Biological Sex (NBTC Cooldown) */}
              <div className="card space-y-2">
                <label className="text-xs font-semibold text-[var(--ink)]">
                  2. Biological Sex (Automated NBTC Cooldown)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBiologicalSex("MALE")}
                    className={`min-h-[48px] rounded-xl text-xs font-semibold transition-all active:scale-[0.98] ${
                      biologicalSex === "MALE"
                        ? "bg-[var(--ink)] text-[var(--bg)] shadow-sm"
                        : "bg-[var(--sf)] border border-[var(--ln)] text-[var(--ink)] hover:bg-[var(--bg)]"
                    }`}
                  >
                    Male (90d NBTC cooldown)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBiologicalSex("FEMALE")}
                    className={`min-h-[48px] rounded-xl text-xs font-semibold transition-all active:scale-[0.98] ${
                      biologicalSex === "FEMALE"
                        ? "bg-[var(--ink)] text-[var(--bg)] shadow-sm"
                        : "bg-[var(--sf)] border border-[var(--ln)] text-[var(--ink)] hover:bg-[var(--bg)]"
                    }`}
                  >
                    Female (120d NBTC cooldown)
                  </button>
                </div>
                <p className="text-[11px] text-[var(--mu)]">
                  Mandatory under National Blood Transfusion Council regulations to protect voluntary donor health.
                </p>
              </div>

              {/* 3. Blood Group Grid */}
              <BloodGroupGrid
                value={bloodGroup}
                onChange={setBloodGroup}
                label="3. Your Blood Group"
              />

              {/* 4. Pune Locality & GPS Pin */}
              <div className="card space-y-2.5">
                <label className="text-xs font-semibold text-[var(--ink)]">
                  4. Primary Pune Locality &amp; Radius
                </label>
                <input
                  type="text"
                  placeholder="Filter Pune areas (e.g. Sinhagad, Deccan, Kothrud)..."
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
                  className="btn2 w-full min-h-[44px] text-xs font-semibold flex items-center justify-center gap-1.5 mt-2 active:scale-[0.98] bg-[var(--sf)] hover:bg-[var(--bg)]"
                >
                  <span>📍</span>
                  {isGettingGps
                    ? "Acquiring coordinates..."
                    : gpsLat && gpsLng
                    ? "✓ Precise GPS Pin Attached"
                    : "Attach Precise GPS Pin for 3 km Waves (Optional)"}
                </button>
              </div>

              {/* 5. Last Donation Date */}
              <div className="card space-y-2">
                <label className="text-xs font-semibold text-[var(--ink)]">
                  5. Last Whole Blood Donation Date (Optional)
                </label>
                <input
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  value={lastDonationDate}
                  onChange={(e) => setLastDonationDate(e.target.value)}
                  className="w-full text-xs font-mono"
                />
                <p className="text-[11px] text-[var(--mu)]">
                  Leave blank if this is your first donation or if it has been &gt; 4 months.
                </p>
              </div>

              {/* 6. Explicit DPDP Consent */}
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
                    I voluntarily consent to BloodLink processing my name, WhatsApp number, blood group, and locality strictly for emergency matching waves. I understand I can delete my data anytime. (
                    <Link href="/privacy" className="text-[var(--rt)] underline">
                      DPDP Notice
                    </Link>
                    )
                  </span>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn w-full min-h-[52px] text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
              >
                {isSubmitting ? "Registering Voluntary Profile..." : "Register as Voluntary Donor →"}
              </button>
            </form>
          )}
        </div>

        {/* Right Column (5 Cols on Desktop): Why BloodLink & Privacy Sidebar */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <div className="card space-y-4 p-5 sm:p-6 bg-[var(--sf)]">
            <h3 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider flex items-center gap-1.5">
              <span>🛡️</span> The BloodLink Donor Guarantee
            </h3>
            <div className="space-y-3 text-xs text-[var(--mu)]">
              <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--ln)] space-y-1">
                <div className="font-bold text-[var(--ink)]">No Midnight Spam</div>
                <p className="leading-relaxed text-[11px]">
                  Unlike public registries where phone numbers are scraped, your number is kept encrypted. You only receive alerts when nearby hospitals submit verified needs.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--ln)] space-y-1">
                <div className="font-bold text-[var(--ink)]">Hyper-Local 3–5 km Wave Alerts</div>
                <p className="leading-relaxed text-[11px]">
                  PostGIS queries alert only donors living close to the hospital, avoiding long travel and ensuring rapid arrival when every minute counts.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--ln)] space-y-1">
                <div className="font-bold text-[var(--ink)]">Automated NBTC Health Locks</div>
                <p className="leading-relaxed text-[11px]">
                  Our database automatically locks your profile for 90 days (males) or 120 days (females) after donation, protecting you from over-donation.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--ln)] space-y-1">
                <div className="font-bold text-[var(--ink)]">1-Tap DPDP Data Erasure</div>
                <p className="leading-relaxed text-[11px]">
                  You maintain full data sovereignty. Clicking &quot;Delete My Data&quot; on your private link immediately removes your profile from all active tables.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
