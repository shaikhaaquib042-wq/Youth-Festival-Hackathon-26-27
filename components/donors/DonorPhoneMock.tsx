'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Donor, BloodRequest, Notification } from '@/types';
import { calculateHaversineKm } from '@/lib/matching/haversine';
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Shield,
  HelpCircle,
  PhoneCall,
  Check,
  RotateCcw,
} from 'lucide-react';

interface DonorPhoneMockProps {
  onClose?: () => void;
}

export const DonorPhoneMock: React.FC<DonorPhoneMockProps> = ({ onClose }) => {
  const { data, ui, clock, donorAccept, donorDecline, revealDonorContact } = useAppStore();

  const activeRequest = data.requests.find((r) => r.id === ui.activeRequestId) || data.requests[0];
  const reqHospital = data.hospitals.find((h) => h.id === activeRequest?.hospitalId) || data.hospitals[0];

  // List of notified donors for this request
  const notifiedDonors = useMemo(() => {
    if (!activeRequest || !activeRequest.notifiedDonorIds) return [];
    return data.donors.filter((d) => activeRequest.notifiedDonorIds.includes(d.id));
  }, [activeRequest, data.donors]);

  // Selected donor to simulate in the phone
  const [selectedDonorId, setSelectedDonorId] = useState<string>(
    notifiedDonors[0]?.id || data.donors[0]?.id || 'donor-001'
  );

  const selectedDonor = useMemo(() => {
    return data.donors.find((d) => d.id === selectedDonorId) || data.donors[0];
  }, [data.donors, selectedDonorId]);

  // Find notification for this donor
  const notification = useMemo(() => {
    if (!activeRequest || !selectedDonor) return null;
    return (
      data.notifications.find(
        (n: Notification) => n.requestId === activeRequest.id && n.donorId === selectedDonor.id
      ) || null
    );
  }, [data.notifications, activeRequest, selectedDonor]);

  // Distance from donor to hospital
  const distanceKm = useMemo(() => {
    if (!selectedDonor || !reqHospital) return 3.2;
    return (
      Math.round(
        calculateHaversineKm(
          selectedDonor.latitude,
          selectedDonor.longitude,
          reqHospital.latitude,
          reqHospital.longitude
        ) * 10
      ) / 10
    );
  }, [selectedDonor, reqHospital]);

  // Modal / subview state inside the phone
  const [viewState, setViewState] = useState<'notification' | 'self_check' | 'declined' | 'accepted'>(
    notification?.status === 'accepted'
      ? 'accepted'
      : notification?.status === 'declined'
      ? 'declined'
      : 'notification'
  );

  // 4-question transient eligibility self-check answers (never persisted, kept in component state only)
  const [selfCheckAnswers, setSelfCheckAnswers] = useState({
    noIllness: false,
    noTattoo: false,
    noMedication: false,
    noTravel: false,
  });

  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('Out of town today');

  const allSelfCheckPassed =
    selfCheckAnswers.noIllness &&
    selfCheckAnswers.noTattoo &&
    selfCheckAnswers.noMedication &&
    selfCheckAnswers.noTravel;

  const handleStartSelfCheck = () => {
    setViewState('self_check');
  };

  const handleConfirmAccept = async () => {
    if (!activeRequest || !selectedDonor || !notification) return;
    await donorAccept(activeRequest.id, selectedDonor.id, notification.id);
    const phone = await revealDonorContact(activeRequest.id, selectedDonor.id);
    setRevealedPhone(phone);
    setViewState('accepted');
  };

  const handleConfirmDecline = async () => {
    if (!activeRequest || !selectedDonor || !notification) return;
    await donorDecline(activeRequest.id, selectedDonor.id, notification.id, declineReason);
    setViewState('declined');
  };

  const handleResetForTesting = () => {
    setViewState('notification');
    setSelfCheckAnswers({
      noIllness: false,
      noTattoo: false,
      noMedication: false,
      noTravel: false,
    });
    setRevealedPhone(null);
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 md:p-6 w-full max-w-4xl mx-auto select-none">
      {/* Donor Selection Bar */}
      <div className="w-full max-w-sm mb-4 glass-panel p-3 rounded-xl border border-surface-border text-xs flex items-center justify-between gap-3">
        <span className="text-slate-400 font-medium whitespace-nowrap">Simulated Phone for:</span>
        <select
          value={selectedDonorId}
          onChange={(e) => {
            setSelectedDonorId(e.target.value);
            setViewState('notification');
          }}
          className="flex-1 bg-surface-elevated border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-cyan font-mono focus:outline-none"
        >
          {notifiedDonors.length > 0 ? (
            notifiedDonors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.firstName} ({d.bloodGroup}) · {d.maskedPhone}
              </option>
            ))
          ) : (
            <option value={selectedDonor?.id}>
              {selectedDonor?.firstName} ({selectedDonor?.bloodGroup}) · {selectedDonor?.maskedPhone}
            </option>
          )}
        </select>
        <button
          onClick={handleResetForTesting}
          title="Reset Phone State"
          className="p-1.5 rounded-lg bg-surface hover:bg-surface-border text-slate-400 hover:text-white"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Realistic Smartphone Frame */}
      <div className="relative w-[340px] h-[680px] bg-black rounded-[48px] p-3 shadow-2xl border-[4px] border-slate-700/80 ring-1 ring-white/10 flex flex-col overflow-hidden">
        {/* Dynamic Island / Speaker Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
        </div>

        {/* Screen Bezel Area */}
        <div className="relative flex-1 bg-surface rounded-[40px] overflow-hidden flex flex-col border border-slate-800">
          {/* Status Bar */}
          <div className="h-10 px-6 pt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 z-20">
            <span>09:41</span>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-4 h-2 border border-slate-400 rounded-sm p-0.5">
                <div className="w-full h-full bg-slate-300 rounded-2xs" />
              </div>
            </div>
          </div>

          {/* WhatsApp / SMS Header */}
          <div className="px-4 py-2 bg-emerald-950/40 border-b border-emerald-500/20 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
              RS
            </div>
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1">
                <span>RaktSetu Emergency Bot</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <p className="text-[10px] text-emerald-400">Verified Precision Alert</p>
            </div>
          </div>

          {/* Screen Content by ViewState */}
          <div className="flex-1 p-3.5 flex flex-col justify-between overflow-y-auto">
            {viewState === 'notification' ? (
              /* Incoming Emergency Notification */
              <div className="space-y-3">
                {/* Incoming Message Bubble */}
                <div className="p-3.5 rounded-2xl bg-surface-elevated border border-surface-border shadow-lg">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blood/20 text-blood text-[10px] font-bold uppercase tracking-wider mb-2 border border-blood/40 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-blood" />
                    URGENT BLOOD REQUEST
                  </div>

                  <div className="flex items-center gap-3 my-2">
                    <div className="w-12 h-12 rounded-xl bg-blood/20 text-blood border border-blood/30 flex items-center justify-center font-display font-extrabold text-2xl shadow-glow-blood">
                      {activeRequest?.bloodGroup || 'B+'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {activeRequest?.bloodGroup || 'B+'} Blood Required
                      </h4>
                      <p className="text-xs text-slate-300">{reqHospital.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {activeRequest?.urgency.toUpperCase() || 'CRITICAL'} · {activeRequest?.units || 2} Units
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-surface-border text-xs text-slate-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-cyan" />
                        Distance to Hospital:
                      </span>
                      <strong className="text-white font-mono">{distanceKm} km</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber" />
                        Response Window:
                      </span>
                      <span className="text-amber font-mono font-medium">10 mins (Tier 1)</span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 bg-surface-elevated/60 p-2.5 rounded-xl border border-surface-border">
                  🔒 <strong>Privacy Protected:</strong> Your phone number remains hidden (+91 XXXXX XX482) until you accept.
                </div>

                {/* Primary Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleStartSelfCheck}
                    className="w-full py-2.5 rounded-xl bg-blood hover:bg-blood/90 text-white font-bold text-xs shadow-glow-blood transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    ACCEPT &amp; PROCEED
                  </button>

                  <button
                    onClick={handleConfirmDecline}
                    className="w-full py-2 rounded-xl bg-surface-elevated hover:bg-surface-border text-slate-400 hover:text-slate-200 font-medium text-xs border border-surface-border transition-all flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    CAN&apos;T MAKE IT
                  </button>
                </div>
              </div>
            ) : viewState === 'self_check' ? (
              /* Transient 4-Question Self-Check */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-cyan" />
                    Eligibility Self-Check
                  </span>
                  <span className="text-[10px] text-cyan font-mono">4 Quick Questions</span>
                </div>

                <div className="space-y-2 text-xs">
                  {[
                    {
                      id: 'noIllness',
                      q: '1. No fever, cold, or illness in the past 7 days?',
                      checked: selfCheckAnswers.noIllness,
                    },
                    {
                      id: 'noTattoo',
                      q: '2. No tattoo, body piercing or dental surgery in the last 6 months?',
                      checked: selfCheckAnswers.noTattoo,
                    },
                    {
                      id: 'noMedication',
                      q: '3. Not currently taking antibiotics or unapproved prescription drugs?',
                      checked: selfCheckAnswers.noMedication,
                    },
                    {
                      id: 'noTravel',
                      q: '4. No international travel to malaria-endemic zones recently?',
                      checked: selfCheckAnswers.noTravel,
                    },
                  ].map(({ id, q, checked }) => (
                    <label
                      key={id}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                        checked
                          ? 'bg-cyan/10 border-cyan/40 text-white'
                          : 'bg-surface-elevated/40 border-surface-border text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSelfCheckAnswers((prev) => ({
                            ...prev,
                            [id]: e.target.checked,
                          }))
                        }
                        className="mt-0.5 rounded border-surface-border text-cyan focus:ring-0"
                      />
                      <span className="text-[11px] leading-snug">{q}</span>
                    </label>
                  ))}
                </div>

                <p className="text-[9px] text-slate-400 bg-surface-elevated p-2 rounded-lg border border-surface-border">
                  * Transient screening answers are held in local component memory only and are never stored in any database. Qualified medical staff at {reqHospital.name} will conduct final donor fitness evaluation.
                </p>

                <div className="space-y-2 pt-1">
                  <button
                    disabled={!allSelfCheckPassed}
                    onClick={handleConfirmAccept}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    CONFIRM &amp; REVEAL TO HOSPITAL
                  </button>

                  <button
                    onClick={() => setViewState('notification')}
                    className="w-full py-1.5 rounded-xl bg-surface-elevated text-slate-400 text-xs hover:text-white"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : viewState === 'accepted' ? (
              /* Accepted & Contact Revealed State */
              <div className="text-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-display text-base font-bold text-white">Donation Confirmed!</h4>
                <p className="text-xs text-slate-300">
                  Thank you, <strong>{selectedDonor?.firstName}</strong>! Your availability has been registered.
                </p>

                {/* Contact Revealed Card */}
                <div className="p-3 rounded-xl bg-surface-elevated border border-emerald-500/30 text-left text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <PhoneCall className="w-3.5 h-3.5" />
                      Contact Shared with Requester
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20">
                      AUDIT LOGGED
                    </span>
                  </div>
                  <div className="font-mono text-white text-sm">
                    {revealedPhone || '+91 00000 48219'}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Hospital Blood Bank Coordinator has been authorized to call for immediate bedside escort.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-elevated/60 border border-surface-border text-left text-xs text-slate-300">
                  <div className="font-semibold text-white mb-0.5">Directions to Center:</div>
                  <div className="text-[11px] text-cyan font-mono">{reqHospital.name}</div>
                  <div className="text-[10px] text-slate-400">Address: {reqHospital.area}, Pune · Tel: {reqHospital.contact}</div>
                </div>

                <button
                  onClick={handleResetForTesting}
                  className="w-full py-2 rounded-xl bg-surface-elevated border border-surface-border text-xs text-slate-300 hover:text-white"
                >
                  Test Another Donor
                </button>
              </div>
            ) : (
              /* Declined State */
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center mx-auto">
                  <XCircle className="w-6 h-6" />
                </div>
                <h4 className="font-display text-base font-bold text-white">Response Recorded</h4>
                <p className="text-xs text-slate-400">
                  No penalty recorded. Next eligible donor in Tier {activeRequest?.tier || 1} will be contacted.
                </p>
                <div className="p-2.5 rounded-lg bg-surface-elevated text-xs font-mono text-slate-400">
                  Reason: {declineReason}
                </div>
                <button
                  onClick={handleResetForTesting}
                  className="w-full py-2 rounded-xl bg-surface-elevated border border-surface-border text-xs text-slate-300 hover:text-white"
                >
                  Reset Simulation
                </button>
              </div>
            )}
          </div>

          {/* Phone Bottom Home Bar */}
          <div className="h-6 flex items-center justify-center">
            <div className="w-24 h-1 bg-slate-700 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
