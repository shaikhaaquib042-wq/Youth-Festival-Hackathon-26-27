'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { BloodGroup, BloodRequest, UrgencyLevel } from '@/types';
import {
  Clock,
  ShieldCheck,
  AlertCircle,
  Users,
  ChevronRight,
  TrendingUp,
  Activity,
  PlusCircle,
  Play,
} from 'lucide-react';

interface RequestSidePanelProps {
  onOpenCreateRequest: () => void;
  onOpenPhoneMock: () => void;
  onRunDemo: () => void;
}

const BLOOD_GROUPS: Array<'ALL' | BloodGroup> = [
  'ALL',
  'O+',
  'B+',
  'A+',
  'AB+',
  'O-',
  'B-',
  'A-',
  'AB-',
];

function formatElapsed(fromIso: string, toIso: string): string {
  const start = Date.parse(fromIso);
  const end = Date.parse(toIso);
  const diffSec = Math.max(0, Math.floor((end - start) / 1000));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

function urgencyBadge(urgency: UrgencyLevel) {
  switch (urgency) {
    case 'critical':
      return 'bg-blood/20 text-blood border-blood/40 animate-pulse';
    case 'urgent':
      return 'bg-amber/20 text-amber border-amber/40';
    case 'planned':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
  }
}

export const RequestSidePanel: React.FC<RequestSidePanelProps> = ({
  onOpenCreateRequest,
  onOpenPhoneMock,
  onRunDemo,
}) => {
  const { data, ui, clock, setSelectedBloodGroup, setActiveRequestId, escalateRequest } =
    useAppStore();

  const activeRequest = data.requests.find((r) => r.id === ui.activeRequestId) || data.requests[0];

  // Calculate Time to First Acceptance
  const timeToFirstAcceptance = React.useMemo(() => {
    if (!activeRequest) return null;
    if (activeRequest.acceptedDonorIds && activeRequest.acceptedDonorIds.length > 0) {
      // Find the notification of first accepted donor
      const firstNotif = data.notifications.find(
        (n) => n.requestId === activeRequest.id && n.status === 'accepted' && n.responseAt
      );
      if (firstNotif && firstNotif.responseAt) {
        return {
          formatted: formatElapsed(activeRequest.createdAt, firstNotif.responseAt),
          isFulfilled: true,
        };
      }
    }
    // Still waiting -> elapsed ticking
    return {
      formatted: formatElapsed(activeRequest.createdAt, clock.currentIso),
      isFulfilled: false,
    };
  }, [activeRequest, data.notifications, clock.currentIso]);

  return (
    <div className="flex flex-col h-full glass-panel-elevated rounded-xl border border-surface-border overflow-hidden p-4 select-none">
      {/* Header & Blood Group Filter Pills */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blood" />
            <span className="font-display font-bold text-sm tracking-wide text-white uppercase">
              Emergency Operations Feed
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-surface-elevated text-cyan text-[11px] font-mono border border-surface-border">
            {data.requests.filter((r) => r.status === 'matching' || r.status === 'open').length} ACTIVE
          </span>
        </div>

        {/* Group Filter Chips */}
        <div className="flex flex-wrap gap-1">
          {BLOOD_GROUPS.map((group) => (
            <button
              key={group}
              onClick={() => setSelectedBloodGroup(group)}
              className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                ui.selectedBloodGroup === group
                  ? 'bg-blood text-white font-bold shadow-glow-blood'
                  : 'bg-surface-elevated hover:bg-surface-hover text-slate-400 border border-surface-border'
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {/* Main Request Details or Empty State */}
      {activeRequest ? (
        <div className="flex-1 flex flex-col justify-between overflow-y-auto pr-1">
          <div className="space-y-3">
            {/* Active Request Card */}
            <div className="p-3.5 rounded-xl bg-surface-elevated/90 border border-surface-border">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-blood/20 text-blood-glow border border-blood/30 flex items-center justify-center font-bold font-mono text-base shadow-glow-blood">
                    {activeRequest.bloodGroup}
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-white leading-tight">
                      {data.hospitals.find((h) => h.id === activeRequest.hospitalId)?.name ||
                        'Pune Hospital'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Units Required: <strong className="text-white">{activeRequest.units}</strong> ·
                      Fulfilled: <strong className="text-cyan">{activeRequest.fulfilledUnits}</strong>
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${urgencyBadge(
                    activeRequest.urgency
                  )}`}
                >
                  {activeRequest.urgency}
                </span>
              </div>

              {/* Status & Verification Badges */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-surface-border/60 text-xs">
                {activeRequest.verificationStatus === 'verified' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Request
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-medium animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Pending Verification
                  </span>
                )}
                <span className="text-slate-500">·</span>
                <span className="text-slate-400 font-mono">
                  Tier {activeRequest.tier === 'rare' ? 'RARE' : activeRequest.tier}
                </span>
              </div>
            </div>

            {/* Time to First Acceptance Ticker */}
            <div
              className="p-3 rounded-xl bg-surface-elevated/60 border border-surface-border"
              role="status"
              aria-live="polite"
              aria-label="Time to first acceptance"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan" />
                  TIME TO FIRST ACCEPTANCE
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    timeToFirstAcceptance?.isFulfilled
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {timeToFirstAcceptance?.isFulfilled ? 'MATCH CONFIRMED' : 'ELAPSED'}
                </span>
              </div>
              <div className="text-2xl font-mono font-bold text-white tracking-wider">
                {timeToFirstAcceptance?.formatted || '0m 00s'}
              </div>
            </div>

            {/* Notification Telemetry Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-surface-elevated/40 border border-surface-border">
                <div className="text-[10px] text-slate-400 font-medium uppercase mb-0.5">
                  Notified Donors
                </div>
                <div className="text-lg font-mono font-bold text-amber">
                  {activeRequest.notifiedDonorIds?.length || 0}
                </div>
                <div className="text-[10px] text-slate-500">Precision contacted</div>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-elevated/40 border border-surface-border">
                <div className="text-[10px] text-slate-400 font-medium uppercase mb-0.5">
                  Accepted Donors
                </div>
                <div className="text-lg font-mono font-bold text-cyan">
                  {activeRequest.acceptedDonorIds?.length || 0}
                </div>
                <div className="text-[10px] text-slate-500">Self-checked ready</div>
              </div>
            </div>

            {/* Rare group banner if applicable */}
            {activeRequest.tier === 'rare' && (
              <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  <strong>RARE BLOOD GROUP ALERT:</strong> Tier restrictions bypassed. 30 km sweep
                  active.
                </span>
              </div>
            )}
          </div>

          {/* Action Triggers */}
          <div className="pt-3 border-t border-surface-border/80 flex flex-col gap-2 mt-4">
            <button
              onClick={onOpenPhoneMock}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-cyan/15 hover:bg-cyan/25 border border-cyan/40 text-cyan text-xs font-semibold transition-colors"
            >
              <span className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Open Donor Phone Simulator
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {activeRequest.status === 'matching' && typeof activeRequest.tier === 'number' && activeRequest.tier < 3 && (
              <button
                onClick={() => escalateRequest(activeRequest.id)}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-border border border-amber/30 text-amber text-xs font-medium transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Escalate Tier Immediately
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="w-12 h-12 rounded-full bg-blood/10 border border-blood/20 flex items-center justify-center text-blood mb-3">
            <Activity className="w-6 h-6" />
          </div>
          <h4 className="font-display text-base font-bold text-white mb-1">
            No Active Requests
          </h4>
          <p className="text-xs text-slate-400 max-w-xs mb-5">
            Create an urgent blood request to test intelligent donor matching or launch the scripted 3-minute pitch demo.
          </p>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <button
              onClick={onOpenCreateRequest}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blood hover:bg-blood/90 text-white text-xs font-bold shadow-glow-blood transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Create Blood Request
            </button>
            <button
              onClick={onRunDemo}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-cyan/40 text-cyan text-xs font-bold transition-colors"
            >
              <Play className="w-4 h-4 fill-cyan" />
              Run 3-Minute Demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
