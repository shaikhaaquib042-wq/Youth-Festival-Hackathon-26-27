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

  // Form states per PRD Section 3
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
      setError("Patient reference initials or IPD/UHID is required.");
      return;
    }
    if (!hospitalId) {
      setError("Please select a verified Pune hospital.");
      return;
    }
    if (!requesterPhone.trim() || requesterPhone.length < 10) {
      setError("Requester contact phone number is required.");
      return;
    }
    if (!verifierPhone.trim() || verifierPhone.length < 10) {
      setError("Duty doctor or blood bank official phone is required.");
      return;
    }
    if (!slipFile) {
      setError("Requisition slip photo upload is mandatory.");
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
        title="Urgent Blood Intake Form"
        subtitle="Route: /request • Patient Family or Hospital Desk"
        bloodGroup={bloodGroup}
        badge="Accredited Intake"
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
        {/* Form Column */}
        <div className="lg:col-span-7 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* 1. Blood Group */}
            <BloodGroupGrid
              value={bloodGroup}
              onChange={setBloodGroup}
              label="Blood Group (A+ to O-)"
            />

            {/* 2. Component & Units */}
            <div className="card space-y-3">
              <label className="text-xs font-semibold text-[var(--ink)]">
                Blood Component &amp; Units
              </label>
              <div className="space-y-3">
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
                        className={`flex-1 min-h-[48px] rounded-lg font-mono font-bold text-sm border transition-all ${
                          unitsNeeded === num
                            ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]"
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
                Clinical Urgency
              </label>
              <div className="grid grid-cols-3 gap-2">
                {URGENCY_LEVELS.map((u) => {
                  const selected = urgency === u.value;
                  return (
                    <button
                      key={u.value}
                      type="button"
                      onClick={() => setUrgency(u.value as any)}
                      className={`min-h-[48px] px-2 rounded-lg text-xs font-semibold text-center border transition-all ${
                        selected
                          ? u.value === "CRITICAL"
                            ? "bg-[#FEE2E2] text-[#991B1B] border-[#991B1B]"
                            : u.value === "URGENT"
                            ? "bg-[#FEF3C7] text-[#92400E] border-[#92400E]"
                            : "bg-[#F1F5F9] text-[#334155] border-[#334155]"
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
                Verified Pune Hospital
              </label>
              {loadingHospitals ? (
                <div className="text-xs text-[var(--mu)] py-2">Loading hospitals...</div>
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
            </div>

            {/* 5. Patient Reference & Phones */}
            <div className="card space-y-3">
              <label className="text-xs font-semibold text-[var(--ink)]">
                Patient Reference &amp; Contact Numbers
              </label>
              <div>
                <span className="text-[11px] text-[var(--mu)] block mb-1">
                  Patient Reference Initials or Hospital IPD / UHID
                </span>
                <input
                  type="text"
                  required
                  placeholder="Initials or Hospital IPD/UHID only"
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
                    placeholder="Patient family phone"
                    value={requesterPhone}
                    onChange={(e) => setRequesterPhone(e.target.value)}
                    className="w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-[var(--mu)] block mb-1">Duty Doctor / Blood Bank Official Phone</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="Official verifier phone"
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
              className="btn w-full min-h-[48px] text-sm font-semibold shadow-xs"
            >
              {isSubmitting ? "Submitting Requisition..." : "Submit Urgent Request"}
            </button>
          </form>
        </div>

        {/* Right Column: Requisition Summary */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
          <div className="card space-y-4 p-5 bg-[var(--sf)]">
            <div className="flex items-center justify-between border-b border-[var(--ln)] pb-3">
              <span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                Requisition Summary
              </span>
              <UrgencyBadge urgency={urgency} />
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-badge w-12 h-12 text-base flex-none">
                {bloodGroup}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-[var(--ink)] truncate">
                  {selectedHospital?.name || "Hospital"}
                </h3>
                <p className="text-xs text-[var(--mu)] mt-0.5">
                  {patientRef ? `Patient: ${patientRef}` : "Patient UHID pending"} • {component.replace("_", " ")}
                </p>
              </div>
            </div>

            <div className="p-3 bg-[var(--bg)] rounded-lg border border-[var(--ln)] flex items-center justify-between text-xs">
              <span className="text-[var(--mu)]">Units Needed:</span>
              <span className="font-mono font-bold text-sm text-[var(--ink)]">
                {unitsNeeded} Unit{unitsNeeded > 1 ? "s" : ""}
              </span>
            </div>

            <p className="text-[11px] text-[var(--mu)] leading-relaxed">
              Per PRD Section 1.2: Exact blood-group matching enforced unless hospital duty doctor authorizes universal O- fallback. Notification waves are capped at 10–15 nearby donors within 3 km.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
