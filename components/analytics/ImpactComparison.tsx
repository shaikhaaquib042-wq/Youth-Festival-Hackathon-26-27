'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { calculateImpactMetrics } from '@/lib/matching/escalation';
import {
  Share2,
  ShieldCheck,
  Zap,
  Clock,
  Users,
  AlertCircle,
  TrendingDown,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const ImpactComparison: React.FC = () => {
  const { data, ui, clock, setActiveView } = useAppStore();

  const activeRequest = data.requests.find((r) => r.id === ui.activeRequestId) || data.requests[0];

  const notifiedCount = activeRequest?.notifiedDonorIds?.length || 5;
  const acceptedCount = activeRequest?.acceptedDonorIds?.length || 1;

  const { estimatedReach, notificationsAvoided } = calculateImpactMetrics(notifiedCount);

  // Calculate live matching stats
  const compatibleDonorsCount = React.useMemo(() => {
    if (!activeRequest) return 220;
    return data.donors.filter((d) => {
      const recipient = activeRequest.bloodGroup;
      if (recipient === 'AB+') return true;
      if (recipient === 'O-') return d.bloodGroup === 'O-';
      if (recipient === 'O+') return d.bloodGroup === 'O-' || d.bloodGroup === 'O+';
      if (recipient === 'A-') return d.bloodGroup === 'O-' || d.bloodGroup === 'A-';
      if (recipient === 'A+') return ['O-', 'O+', 'A-', 'A+'].includes(d.bloodGroup);
      if (recipient === 'B-') return d.bloodGroup === 'O-' || d.bloodGroup === 'B-';
      if (recipient === 'B+') return ['O-', 'O+', 'B-', 'B+'].includes(d.bloodGroup);
      if (recipient === 'AB-') return ['O-', 'A-', 'B-', 'AB-'].includes(d.bloodGroup);
      return false;
    }).length;
  }, [activeRequest, data.donors]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 select-none">
      {/* Hero Headline */}
      <div className="text-center space-y-2 py-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blood/10 border border-blood/30 text-blood text-xs font-semibold uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5 fill-blood" />
          <span>The Core Value Proposition</span>
        </div>
        <h2 className="font-display font-extrabold text-3xl md:text-4xl text-white">
          500 Random Forwards vs 5 Intelligent Matches
        </h2>
        <p className="text-xs md:text-sm text-slate-400 max-w-2xl mx-auto">
          Comparing the chaotic blast radius of traditional messaging forwards against RaktSetu&apos;s surgical, privacy-preserving escalation engine.
        </p>
      </div>

      {/* Side-by-Side Architectural Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Traditional WhatsApp Forward */}
        <div className="glass-panel p-6 rounded-2xl border border-red-500/20 bg-gradient-to-b from-red-950/20 to-transparent flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2 text-red-400">
                <Share2 className="w-5 h-5" />
                <h3 className="font-display font-bold text-base uppercase">
                  Traditional WhatsApp Forward
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-mono font-bold border border-red-500/30">
                CHAOTIC BROADCAST
              </span>
            </div>

            {/* Simulated Viral Message Bubble */}
            <div className="p-3.5 rounded-xl bg-surface-elevated/80 border border-surface-border text-xs space-y-1.5 font-sans relative overflow-hidden">
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Forwarded many times</span>
                <span className="text-red-400 font-mono font-bold">STALE FORWARD</span>
              </div>
              <p className="text-slate-200 font-medium">
                &ldquo;🚨 URGENT! 2 Units {activeRequest?.bloodGroup || 'B+'} blood needed at{' '}
                {data.hospitals.find((h) => h.id === activeRequest?.hospitalId)?.name || 'Ruby Hall Clinic'}. Patient critical. Contact {activeRequest?.requester?.name || 'Pooja'}: {activeRequest?.requester?.phone || '+91 98220 12345'}. PLEASE FORWARD TO ALL GROUPS! 🙏&rdquo;
              </p>
            </div>

            {/* Pain Points List */}
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Massive Untargeted Audience:</strong> Circulates across college, society, and family groups with zero compatibility filtering.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Permanent Contact Leakage:</strong> Phone numbers are indexed publicly, leading to spam and phishing calls.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Zombie Stale Loops:</strong> Messages keep circulating days and weeks after the patient is discharged.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Average Response Delay:</strong> ~140 minutes before reaching an eligible donor.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-surface-border">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-slate-400">ESTIMATED GROUP REACH:</span>
              <span className="text-xl font-bold text-red-400">~{estimatedReach} people</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              * Simulated illustrative estimate based on 5 groups x 120 members with 15% overlap.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: RaktSetu Intelligent Matching */}
        <div className="glass-panel-elevated p-6 rounded-2xl border border-cyan/30 bg-gradient-to-b from-cyan-950/20 to-transparent flex flex-col justify-between shadow-glow-cyan">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2 text-cyan">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-display font-bold text-base uppercase">
                  RaktSetu Intelligent Matching
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-cyan/10 text-cyan text-[10px] font-mono font-bold border border-cyan/30">
                PRECISION ESCALATION
              </span>
            </div>

            {/* Telemetry Metric Cards */}
            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className="p-3 rounded-xl bg-surface-elevated/70 border border-surface-border">
                <div className="text-[10px] text-slate-400 uppercase">Precision Contacted</div>
                <div className="text-2xl font-bold text-cyan mt-1">{notifiedCount} Donors</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Tier 1 (&lt;5km radius)</div>
              </div>
              <div className="p-3 rounded-xl bg-surface-elevated/70 border border-surface-border">
                <div className="text-[10px] text-slate-400 uppercase">Notifications Avoided</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  {notificationsAvoided} Avoided
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">99% Spam reduction</div>
              </div>
            </div>

            {/* Benefits List */}
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Surgical Compatibility:</strong> Identified {compatibleDonorsCount} compatible donors across Pune, notified only top {notifiedCount} nearest eligible.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
                <div>
                  <strong>Zero Contact Exposure:</strong> Donor contact masked until 2-factor verified acceptance with audit logging.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                <div>
                  <strong>Instant Auto-Expiry:</strong> Request closes immediately when units are fulfilled. No stale forwards.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Time to Acceptance:</strong> 6 minutes simulated vs 140 minutes broadcast delay.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-surface-border">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-slate-400">ACTIVE STATUS:</span>
              <span className="text-cyan font-bold">
                {acceptedCount} Donor Accepted · Units Fulfilled: {activeRequest?.fulfilledUnits || 0}/{activeRequest?.units || 2}
              </span>
            </div>
            <button
              onClick={() => setActiveView('map')}
              className="mt-3 w-full py-2 rounded-lg bg-cyan hover:bg-cyan/90 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all"
            >
              Inspect Live Dynamic Arcs on Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
