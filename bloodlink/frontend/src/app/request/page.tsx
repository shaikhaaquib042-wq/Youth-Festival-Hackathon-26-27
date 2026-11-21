"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { BloodGroupGrid } from "@/components/BloodGroupGrid";
import { SlipUploader } from "@/components/SlipUploader";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import {
  submitRequest,
  getHospitals,
  COMPONENTS,
  URGENCY_LEVELS,
} from "@/lib/api";

interface Hospital {
  id: string;
  name: string;
  area_label: string;
}

export default function RequestPage() {
  const router = useRouter();

  // Form states
  const [patientRef, setPatientRef] = useState("");
  const [bloodGroup, setBloodGroup] = useState("A+");
  const [component, setComponent] = useState("WHOLE_BLOOD");
  const [unitsNeeded, setUnitsNeeded] = useState(1);
  const [urgency, setUrgency] = useState<"CRITICAL" | "URGENT" | "SCHEDULED">("CRITICAL");
  const [hospitalId, setHospitalId] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [verifierPhone, setVerifierPhone] = useState("");
  const [slipFile, setSlipFile] = useState<File | null>(null);

  // Status & validation states
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHospitals() {
      setLoadingHospitals(true);
      const res = await getHospitals();
      if (res.data && res.data.length > 0) {
        setHospitals(res.data);
        setHospitalId(res.data[0].id);
      }
      setLoadingHospitals(false);
    }
    fetchHospitals();
  }, []);

  const handleFileCompressed = useCallback((file: File) => {
    setSlipFile(file);
    setError(null);
  }, []);

  const selectedHospital = hospitals.find((h) => h.id === hospitalId) || hospitals[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!patientRef.trim()) {
      setError("Please provide patient reference initials or IPD/UHID.");
      return;
    }
    if (!hospitalId) {
      setError("Please select an accredited Pune hospital.");
      return;
    }
    if (!requesterPhone.trim() || requesterPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number for requester contact.");
      return;
    }
    if (!verifierPhone.trim() || verifierPhone.length < 10) {
      setError("Please enter a valid official mobile number for duty doctor / blood bank.");
      return;
    }
    if (!slipFile) {
      setError("An official hospital requisition slip photo is required for clinical verification.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("patient_reference", patientRef.trim());
      formData.append("blood_group", bloodGroup);
      formData.append("component", component);
      formData.append("units_needed", unitsNeeded.toString());
      formData.append("urgency", urgency);
      formData.append("hospital_id", hospitalId);
      formData.append("requester_phone", requesterPhone.trim());
      formData.append("verifier_phone", verifierPhone.trim());
      formData.append("slip_image", slipFile);

      const res = await submitRequest(formData);

      if (res.error) {
        setError(res.error);
        setIsSubmitting(false);
      } else if (res.data?.request_id) {
        router.push(`/track/${res.data.request_id}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit request.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <AppHeader
        title="Urgent Blood Requisition Intake"
        subtitle="Distance-ranked voluntary notification waves • Pune hospital cluster"
        bloodGroup={bloodGroup}
        backHref="/"
        backLabel="Home"
      />

      {error && (
        <div
          className="p-4 bg-[var(--tint)] text-[var(--rt)] rounded-2xl text-xs font-semibold border border-[var(--ln)] flex items-start gap-2 shadow-xs"
          role="alert"
        >
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* 2-Column Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column (7 Cols on Desktop) */}
        <div className="lg:col-span-7 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* 1. Blood Group */}
            <BloodGroupGrid
              value={bloodGroup}
              onChange={setBloodGroup}
              label="1. Required Blood Group"
            />

            {/* 2. Component & Units */}
            <div className="card space-y-3">
              <label className="text-xs font-semibold text-[var(--ink)]">
                2. Blood Component &amp; Units Needed
              </label>
              <div className="space-y-2.5">
                <div>
                  <span className="text-[11px] text-[var(--mu)] block mb-1">Component</span>
                  <select
                    value={component}
                    onChange={(e) => setComponent(e.target.value)}
                    className="w-full text-xs font-medium cursor-pointer"
                  >
                    {COMPONENTS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-[var(--mu)]">Units Needed (1 - 6)</span>
                    <span className="text-xs font-mono font-bold text-[var(--ink)]">
                      {unitsNeeded} Unit{unitsNeeded > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setUnitsNeeded(num)}
                        className={`flex-1 min-h-[46px] rounded-xl font-mono font-bold text-sm border transition-all active:scale-[0.97] ${
                          unitsNeeded === num
                            ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] shadow-sm"
                            : "bg-[var(--sf)] border-[var(--ln)] text-[var(--ink)] hover:bg-[var(--bg)]"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Clinical Urgency */}
            <div className="card space-y-2">
              <label className="text-xs font-semibold text-[var(--ink)]">
                3. Clinical Urgency Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {URGENCY_LEVELS.map((u) => {
                  const selected = urgency === u.value;
                  return (
                    <button
                      key={u.value}
                      type="button"
                      onClick={() => setUrgency(u.value as any)}
                      className={`min-h-[46px] px-2 rounded-xl text-xs font-semibold text-center border transition-all active:scale-[0.98] ${
                        selected
                          ? u.value === "CRITICAL"
                            ? "bg-[var(--tint)] text-[var(--rt)] border-[var(--rt)] ring-1 ring-[var(--rt)]"
                            : u.value === "URGENT"
                            ? "bg-[#FEF3C7] text-[#92400E] border-[#D97706] ring-1 ring-[#D97706]"
                            : "bg-[var(--ln)] text-[var(--ink)] border-[var(--mu)] ring-1 ring-[var(--mu)]"
                          : "bg-[var(--sf)] border-[var(--ln)] text-[var(--mu)] hover:bg-[var(--bg)]"
                      }`}
                    >
                      {u.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Receiving Pune Hospital */}
            <div className="card space-y-2">
              <label className="text-xs font-semibold text-[var(--ink)]">
                4. Receiving Accredited Pune Hospital
              </label>
              {loadingHospitals ? (
                <div className="text-xs text-[var(--mu)] py-2">Loading verified institutions...</div>
              ) : (
                <select
                  value={hospitalId}
                  onChange={(e) => setHospitalId(e.target.value)}
                  className="w-full text-xs font-medium cursor-pointer"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.area_label})
                    </option>
                  ))}
                </select>
              )}
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--ok)] font-medium pt-0.5">
                <span>🛡️</span> Accredited Pune blood centres with dedicated transfusion medical officers.
              </div>
            </div>

            {/* 5. Patient Reference & Contacts */}
            <div className="card space-y-3">
              <label className="text-xs font-semibold text-[var(--ink)]">
                5. Clinical Reference &amp; Contact Numbers
              </label>
              <div>
                <span className="text-[11px] text-[var(--mu)] block mb-1">
                  Patient Initials or Hospital IPD / UHID
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. R.S. or IPD-48921 (DPDP privacy compliant)"
                  value={patientRef}
                  onChange={(e) => setPatientRef(e.target.value)}
                  className="w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-[var(--mu)] block mb-1">Requester Phone</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="Patient family mobile"
                    value={requesterPhone}
                    onChange={(e) => setRequesterPhone(e.target.value)}
                    className="w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-[var(--mu)] block mb-1">Duty Doctor / Blood Bank</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="Doctor WhatsApp for sign-off"
                    value={verifierPhone}
                    onChange={(e) => setVerifierPhone(e.target.value)}
                    className="w-full text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 6. Requisition Slip Uploader */}
            <SlipUploader onFileCompressed={handleFileCompressed} required />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn w-full min-h-[52px] text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Dispatching Requisition...</span>
              ) : (
                <span>Submit Requisition for Clinical Sign-Off →</span>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Live Requisition Preview & Timeline (5 Cols on Desktop) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          {/* Live Preview Card */}
          <div className="card space-y-4 p-5 sm:p-6 bg-[var(--sf)] border-2 border-[var(--ln)]">
            <div className="flex items-center justify-between border-b border-[var(--ln)] pb-3">
              <span className="text-[11px] font-bold text-[var(--mu)] uppercase tracking-wider">
                Live Requisition Preview
              </span>
              <UrgencyBadge urgency={urgency} />
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-badge w-12 h-12 text-base flex-none">
                {bloodGroup}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-[var(--ink)] truncate">
                  {selectedHospital?.name || "Sahyadri Hospital"}
                </h3>
                <p className="text-xs text-[var(--mu)]">
                  {patientRef ? `Patient: ${patientRef}` : "Patient UHID pending"} • {component.replace("_", " ")}
                </p>
              </div>
            </div>

            <div className="p-3 bg-[var(--bg)] rounded-xl border border-[var(--ln)] flex items-center justify-between text-xs">
              <span className="text-[var(--mu)]">Required Units:</span>
              <span className="font-mono font-bold text-base text-[var(--ink)]">
                {unitsNeeded} Unit{unitsNeeded > 1 ? "s" : ""}
              </span>
            </div>

            <div className="text-[11px] text-[var(--mu)] leading-relaxed bg-[var(--tint)]/40 p-3 rounded-xl border border-[var(--ln)]">
              ℹ️ Once submitted, the duty doctor receives a private WhatsApp sign-off link. The PostGIS matching engine will alert 10–15 nearest eligible donors within 3 km.
            </div>
          </div>

          {/* How Matching Works Timeline */}
          <div className="card space-y-3 p-5 sm:p-6 bg-[var(--sf)]">
            <h3 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
              Wave Dispatch Architecture
            </h3>
            <div className="space-y-3 text-xs text-[var(--mu)]">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--tint)] text-[var(--rt)] flex items-center justify-center font-bold text-[10px] flex-none">1</span>
                <div>
                  <strong className="text-[var(--ink)] block">Intake &amp; Image Hash:</strong>
                  Requisition slip photo is compressed client-side and stored securely.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--tint)] text-[var(--rt)] flex items-center justify-center font-bold text-[10px] flex-none">2</span>
                <div>
                  <strong className="text-[var(--ink)] block">Clinician Authorization:</strong>
                  Duty doctor verifies slip authenticity via single-tap capability token.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--tint)] text-[var(--rt)] flex items-center justify-center font-bold text-[10px] flex-none">3</span>
                <div>
                  <strong className="text-[var(--ink)] block">PostGIS Wave Dispatch:</strong>
                  Nearest 10–15 eligible donors within 3 km (expanding to 7 km / 15 km) receive WhatsApp alert.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--tint)] text-[var(--rt)] flex items-center justify-center font-bold text-[10px] flex-none">4</span>
                <div>
                  <strong className="text-[var(--ink)] block">First Acceptance Locks Slot:</strong>
                  Unit slot is reserved, triggering a 45-minute arrival countdown on live board.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
