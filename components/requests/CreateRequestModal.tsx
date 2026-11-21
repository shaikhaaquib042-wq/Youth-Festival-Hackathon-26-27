'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { BloodGroup, UrgencyLevel, BloodRequest } from '@/types';
import { CONFIG } from '@/lib/config';
import { checkDonorEligibility } from '@/lib/matching/eligibility';
import { rankDonors } from '@/lib/matching/scoring';
import { isRareBloodGroup } from '@/lib/matching/escalation';
import {
  X,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Users,
  MapPin,
  HeartPulse,
} from 'lucide-react';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BLOOD_GROUPS: BloodGroup[] = ['O+', 'B+', 'A+', 'AB+', 'O-', 'B-', 'A-', 'AB-'];

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({ isOpen, onClose }) => {
  const { data, clock, createRequest, verifyRequest, setActiveRequestId, setActiveView } = useAppStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Group, Units, Hospital
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('B+');
  const [units, setUnits] = useState<number>(2);
  const [hospitalId, setHospitalId] = useState<string>(data.hospitals[0]?.id || 'hosp-1');

  // Step 2: Urgency
  const [urgency, setUrgency] = useState<UrgencyLevel>('critical');

  // Step 3: Requester Details & Verification
  const [requesterName, setRequesterName] = useState<string>('Pooja Deshmukh');
  const [requesterPhone, setRequesterPhone] = useState<string>('+91 98220 12345');
  const [patientId, setPatientId] = useState<string>('RHC-2026-9812');
  const [verificationInput, setVerificationInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Generated simulated demo codes
  const selectedHospital = data.hospitals.find((h) => h.id === hospitalId) || data.hospitals[0];
  const demoCode = useMemo(() => {
    const prefix = selectedHospital?.name.slice(0, 3).toUpperCase() || 'PUN';
    return `${prefix}-7824`;
  }, [selectedHospital]);

  // Live Matching Engine Preview (pure calculation)
  const matchingPreview = useMemo(() => {
    if (!selectedHospital) return { compatibleCount: 0, eligibleCount: 0, tier1Count: 0, isRare: false };

    const isRare = isRareBloodGroup(bloodGroup);
    let compatibleCount = 0;
    const eligibleDonors = [];

    for (const donor of data.donors) {
      const eligibility = checkDonorEligibility(donor, bloodGroup, clock.currentIso);
      if (!eligibility.reason?.includes('not red-cell compatible')) {
        compatibleCount++;
      }
      if (eligibility.isEligible) {
        eligibleDonors.push(donor);
      }
    }

    const ranked = rankDonors(eligibleDonors, bloodGroup, selectedHospital.latitude, selectedHospital.longitude);

    let tier1Count = 0;
    if (isRare) {
      tier1Count = ranked.filter((s) => s.components.distanceKm <= CONFIG.RARE_RADIUS_KM).length;
    } else {
      tier1Count = Math.min(
        CONFIG.TIERS.TIER_1.MAX_DONORS,
        ranked.filter((s) => s.components.distanceKm <= CONFIG.TIERS.TIER_1.RADIUS_KM).length
      );
    }

    return {
      compatibleCount,
      eligibleCount: eligibleDonors.length,
      tier1Count,
      isRare,
    };
  }, [bloodGroup, selectedHospital, data.donors, clock.currentIso]);

  if (!isOpen) return null;

  const handleNextStep1 = () => {
    setStep(2);
  };

  const handleNextStep2 = () => {
    setStep(3);
  };

  const handleCreateAndVerify = async () => {
    setIsVerifying(true);
    setVerificationError(null);

    const expiryHours =
      urgency === 'critical'
        ? CONFIG.EXPIRY.CRITICAL_HOURS
        : urgency === 'urgent'
        ? CONFIG.EXPIRY.URGENT_HOURS
        : CONFIG.EXPIRY.PLANNED_HOURS;

    const expiresAt = new Date(Date.parse(clock.currentIso) + expiryHours * 3600 * 1000).toISOString();

    const newRequest: BloodRequest = {
      id: `req-${Date.now()}`,
      bloodGroup,
      units,
      hospitalId,
      urgency,
      createdAt: clock.currentIso,
      expiresAt,
      status: 'open',
      verifiedBy: null,
      verificationStatus: 'pending',
      tier: 0,
      acceptedDonorIds: [],
      notifiedDonorIds: [],
      fulfilledUnits: 0,
      requester: {
        name: requesterName,
        phone: requesterPhone,
        hospitalPatientId: patientId,
      },
      verificationCode: demoCode,
      verificationAttempts: 0,
    };

    try {
      await createRequest(newRequest);
      setCreatedRequestId(newRequest.id);

      // Verify immediately using provided code
      const result = await verifyRequest(newRequest.id, verificationInput || demoCode);
      if (result.success) {
        setIsSuccess(true);
        setActiveRequestId(newRequest.id);
      } else {
        setVerificationError(result.error || 'Verification failed');
      }
    } catch (err) {
      setVerificationError(err instanceof Error ? err.message : 'Failed to create request');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDone = () => {
    onClose();
    setActiveView('map');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="relative w-full max-w-xl glass-panel-elevated rounded-2xl border border-surface-border overflow-hidden p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-blood animate-pulse" />
            <h3 className="font-display font-bold text-lg text-white">Create Urgent Blood Request</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-elevated"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="flex items-center justify-between py-3 px-2 border-b border-surface-border/50 text-xs font-mono">
          <span className={`flex items-center gap-1.5 ${step >= 1 ? 'text-blood font-bold' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">1</span>
            Blood & Hospital
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className={`flex items-center gap-1.5 ${step >= 2 ? 'text-amber font-bold' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">2</span>
            Urgency Level
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className={`flex items-center gap-1.5 ${step >= 3 ? 'text-cyan font-bold' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">3</span>
            Verify & Broadcast
          </span>
        </div>

        {/* Modal Body */}
        <div className="py-4">
          {isSuccess ? (
            /* Success confirmation */
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-display text-xl font-bold text-white mb-2">Request Verified & Broadcasting</h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto mb-4">
                Matched <strong>{matchingPreview.tier1Count}</strong> eligible donors in Tier 1. Notified via precision simulated SMS/WhatsApp.
              </p>
              <div className="inline-flex items-center gap-2 p-3 rounded-lg bg-surface-elevated border border-surface-border text-xs font-mono text-cyan mb-6">
                <span>Request ID: {createdRequestId} · Ruby Hall Clinic · {bloodGroup}</span>
              </div>
              <div>
                <button
                  onClick={handleDone}
                  className="px-6 py-2.5 rounded-lg bg-blood hover:bg-blood/90 text-white font-bold text-xs shadow-glow-blood transition-all"
                >
                  View Live Matching on Map
                </button>
              </div>
            </div>
          ) : step === 1 ? (
            /* STEP 1: Blood Group, Units, Hospital */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Select Blood Group Required
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {BLOOD_GROUPS.map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setBloodGroup(bg)}
                      className={`p-3 rounded-xl border font-mono font-bold text-sm transition-all ${
                        bloodGroup === bg
                          ? 'bg-blood/20 border-blood text-white shadow-glow-blood'
                          : 'bg-surface-elevated/70 border-surface-border text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Units Required
                  </label>
                  <select
                    value={units}
                    onChange={(e) => setUnits(Number(e.target.value))}
                    className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan"
                  >
                    {[1, 2, 3, 4, 5, 6].map((u) => (
                      <option key={u} value={u}>
                        {u} Unit{u > 1 ? 's' : ''} (Red Cells)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Hospital Node
                  </label>
                  <select
                    value={hospitalId}
                    onChange={(e) => setHospitalId(e.target.value)}
                    className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan"
                  >
                    {data.hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Matching Engine Telemetry Banner */}
              <div className="p-3 rounded-xl bg-surface-elevated border border-cyan/30 text-xs">
                <div className="flex items-center justify-between text-cyan font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    LIVE MATCHING PREVIEW
                  </span>
                  <span className="font-mono">{matchingPreview.eligibleCount} eligible found</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {matchingPreview.compatibleCount} compatible donors in Pune ·{' '}
                  <strong className="text-white">{matchingPreview.tier1Count}</strong> will be notified in{' '}
                  {matchingPreview.isRare ? 'Rare Sweep (30km)' : 'Tier 1 (<5km)'}.
                </p>
              </div>
            </div>
          ) : step === 2 ? (
            /* STEP 2: Urgency Selection */
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Select Medical Urgency Level
              </label>

              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    level: 'critical' as UrgencyLevel,
                    title: 'CRITICAL (Immediate Life Threat)',
                    desc: 'Emergency trauma, severe hemorrhage, acute surgery. 4-hour auto-expiry window.',
                    color: 'border-blood/50 bg-blood/10 text-blood',
                  },
                  {
                    level: 'urgent' as UrgencyLevel,
                    title: 'URGENT (Required Within 8 Hours)',
                    desc: 'Scheduled urgent procedure, severe anemia, thalassemia transfusion.',
                    color: 'border-amber/50 bg-amber/10 text-amber',
                  },
                  {
                    level: 'planned' as UrgencyLevel,
                    title: 'PLANNED (Required Within 24 Hours)',
                    desc: 'Elective surgery reserve, planned platelet or RBC exchange.',
                    color: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
                  },
                ].map(({ level, title, desc, color }) => (
                  <div
                    key={level}
                    onClick={() => setUrgency(level)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      urgency === level ? `${color} ring-1 ring-white/20` : 'bg-surface-elevated/60 border-surface-border hover:border-slate-500 text-slate-300'
                    }`}
                  >
                    <div className="font-display font-bold text-xs uppercase mb-1">{title}</div>
                    <p className="text-[11px] text-slate-400">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* STEP 3: Verification & Confirmation */
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Requester / Attendant Name
                  </label>
                  <input
                    type="text"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Requester Contact Phone
                  </label>
                  <input
                    type="text"
                    value={requesterPhone}
                    onChange={(e) => setRequesterPhone(e.target.value)}
                    className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Hospital Patient / Bed ID
                </label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Simulated Hospital Verification Code Card */}
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-surface-border">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan" />
                    Simulated Hospital Confirmation Code
                  </span>
                  <button
                    type="button"
                    onClick={() => setVerificationInput(demoCode)}
                    className="text-[10px] text-cyan hover:underline font-mono"
                  >
                    Auto-Fill Demo Code
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Enter code (e.g. ${demoCode})`}
                    value={verificationInput}
                    onChange={(e) => setVerificationInput(e.target.value)}
                    className="flex-1 bg-surface border border-surface-border rounded-lg px-3 py-2 text-xs font-mono text-white tracking-widest uppercase"
                  />
                  <span className="text-[10px] text-slate-400 font-mono px-2 py-1 bg-surface-border/50 rounded">
                    DEMO: {demoCode}
                  </span>
                </div>
                {verificationError && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {verificationError}
                  </p>
                )}
                <p className="text-[10px] text-slate-500 mt-2">
                  * Unverified requests can never trigger donor notifications. Verification requires medical staff confirmation.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!isSuccess && (
          <div className="pt-4 border-t border-surface-border flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-elevated text-xs text-slate-300 hover:text-white border border-surface-border"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={step === 1 ? handleNextStep1 : handleNextStep2}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-blood hover:bg-blood/90 text-white font-bold text-xs shadow-glow-blood transition-all"
              >
                Continue
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleCreateAndVerify}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan hover:bg-cyan/90 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                {isVerifying ? 'Verifying...' : 'Verify & Broadcast'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
