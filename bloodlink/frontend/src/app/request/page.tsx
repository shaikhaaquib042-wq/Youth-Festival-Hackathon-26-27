"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { BloodGroupGrid } from "@/components/BloodGroupGrid";
import { SlipUploader } from "@/components/SlipUploader";
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
      setError("Please enter a valid official mobile number for the duty doctor / blood bank.");
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
    <div className="space-y-5 pb-8">
      <AppHeader
        title="Urgent Blood Requisition"
        subtitle="Direct hospital-verified wave dispatch • Pune"
        bloodGroup={bloodGroup}
        backHref="/"
        backLabel="Cancel"
      />

      {error && (
        <div
          className="p-3 bg-[var(--tint)] text-[var(--rt)] rounded-xl text-xs font-semibold border border-[var(--ln)] flex items-start gap-2"
          role="alert"
        >
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Blood Group Selection Grid */}
        <BloodGroupGrid
          value={bloodGroup}
          onChange={setBloodGroup}
          label="1. Required Blood Group"
        />

        {/* Component & Units */}
        <div className="card space-y-3">
          <label className="text-xs font-semibold text-[var(--ink)]">
            2. Component &amp; Units
          </label>
          <div className="space-y-2.5">
            <div>
              <span className="text-[11px] text-[var(--mu)] block mb-1">Blood Component Type</span>
              <select
                value={component}
                onChange={(e) => setComponent(e.target.value)}
                className="w-full text-xs font-medium cursor-pointer"
                aria-label="Select blood component"
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
                <span className="text-xs font-mono font-bold text-[var(--ink)]">{unitsNeeded} Unit(s)</span>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setUnitsNeeded(num)}
                    className={`flex-1 min-h-[44px] rounded-xl font-mono font-bold text-sm border transition-all active:scale-[0.97] ${
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

        {/* Clinical Urgency Level */}
        <div className="card space-y-2">
          <label className="text-xs font-semibold text-[var(--ink)]">
            3. Clinical Urgency
          </label>
          <div className="grid grid-cols-3 gap-2">
            {URGENCY_LEVELS.map((u) => {
              const selected = urgency === u.value;
              return (
                <button
                  key={u.value}
                  type="button"
                  onClick={() => setUrgency(u.value as any)}
                  className={`min-h-[44px] px-2 rounded-xl text-xs font-semibold text-center border transition-all active:scale-[0.98] ${
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

        {/* Receiving Pune Hospital */}
        <div className="card space-y-2">
          <label className="text-xs font-semibold text-[var(--ink)]">
            4. Receiving Pune Hospital / Blood Centre
          </label>
          {loadingHospitals ? (
            <div className="text-xs text-[var(--mu)] py-2">Loading verified institutions...</div>
          ) : (
            <select
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
              className="w-full text-xs font-medium cursor-pointer"
              aria-label="Select hospital"
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.area_label})
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--ok)] font-medium pt-0.5">
            <span>🛡️</span> Only whitelisted Pune hospitals with accredited transfusion facilities.
          </div>
        </div>

        {/* Patient Reference & Contacts */}
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
              <span className="text-[11px] text-[var(--mu)] block mb-1">Requester Mobile</span>
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="Family contact"
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

        {/* Requisition Slip Uploader */}
        <SlipUploader onFileCompressed={handleFileCompressed} required />

        {/* Action Button */}
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

        <p className="text-[11px] text-center text-[var(--mu)]">
          In compliance with Indian healthcare regulations, waves of 10–15 nearby donors are triggered only after clinician sign-off.
        </p>
      </form>
    </div>
  );
}
