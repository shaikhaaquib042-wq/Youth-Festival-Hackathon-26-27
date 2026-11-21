'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  Trash2,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle,
  Database,
  Search,
} from 'lucide-react';

export const PrivacyCenter: React.FC = () => {
  const { data, clock } = useAppStore();
  const [auditFilter, setAuditFilter] = useState('');
  const [maskingDemoRevealed, setMaskingDemoRevealed] = useState(false);

  const filteredLogs = data.auditLogs.filter((entry) => {
    if (!auditFilter) return true;
    const q = auditFilter.toLowerCase();
    return (
      entry.action.toLowerCase().includes(q) ||
      entry.actor.toLowerCase().includes(q) ||
      entry.requestId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 select-none">
      {/* Hero Header */}
      <div className="glass-panel-elevated p-6 rounded-2xl border border-surface-border">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan/10 border border-cyan/30 text-cyan text-xs font-semibold mb-3">
          <ShieldCheck className="w-4 h-4" />
          <span>ZERO-SPAM · ZERO-SURVEILLANCE ARCHITECTURE</span>
        </div>
        <h2 className="font-display font-bold text-2xl text-white mb-2">
          RaktSetu Privacy &amp; Data Ethics Center
        </h2>
        <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
          In urgent blood emergencies, public WhatsApp broadcasts inadvertently leak phone numbers, exposing patients and donors to spam and fraud. RaktSetu enforces strict data minimization, granular cryptographic masking, and automatic PII purging.
        </p>
      </div>

      {/* 4 Pillars of Privacy */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-surface-border flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-cyan/15 text-cyan flex items-center justify-center mb-3">
              <Database className="w-5 h-5" />
            </div>
            <h4 className="font-display font-semibold text-white text-sm mb-1.5">
              1. Extreme Minimization
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              We store only blood group and last donation date. No medical histories, Aadhaar numbers, or chronic diagnoses are ever stored.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-border text-[11px] text-cyan font-mono">
            Health Data: 2 Fields Only
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-surface-border flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-amber/15 text-amber flex items-center justify-center mb-3">
              <EyeOff className="w-5 h-5" />
            </div>
            <h4 className="font-display font-semibold text-white text-sm mb-1.5">
              2. Two-Factor Masking
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Donor contacts stay masked as +91 XXXXX XX482. Contact is only revealed to a verified requester AFTER the donor accepts.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-border text-[11px] text-amber font-mono">
            Zero Public Exposure
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-surface-border flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="font-display font-semibold text-white text-sm mb-1.5">
              3. Ephemeral Screening
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              The 4-question eligibility self-check (illness, tattoos, travel, meds) is processed purely in client memory and is never logged.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-border text-[11px] text-emerald-400 font-mono">
            Transient State Only
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-surface-border flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-blood/15 text-blood-glow flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h4 className="font-display font-semibold text-white text-sm mb-1.5">
              4. 24h PII Auto-Purge
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Once an emergency request is fulfilled or closed, all requester names, bed numbers, and contact numbers are permanently wiped.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-border text-[11px] text-blood font-mono">
            Automated Garbage Collection
          </div>
        </div>
      </div>

      {/* Interactive Contact Masking Demo */}
      <div className="glass-panel p-6 rounded-2xl border border-surface-border">
        <h3 className="font-display font-bold text-base text-white mb-2 flex items-center gap-2">
          <Lock className="w-4 h-4 text-cyan" />
          Interactive Contact Masking &amp; Reveal Protocol
        </h3>
        <p className="text-xs text-slate-400 mb-4 max-w-2xl">
          Toggle below to inspect how donor contact information transitions from masked broadcast state to authorized bedside coordination:
        </p>

        <div className="p-4 rounded-xl bg-surface-elevated border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-1">
              Donor ID: <span className="font-mono text-cyan">donor-042 (Vihaan Joshi, B+)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-mono font-bold text-white tracking-wider">
                {maskingDemoRevealed ? '+91 00000 48242' : '+91 XXXXX XX242'}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  maskingDemoRevealed
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}
              >
                {maskingDemoRevealed ? 'REVEALED (AUDITED)' : 'PROTECTED (MASKED)'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setMaskingDemoRevealed(!maskingDemoRevealed)}
            className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-border border border-surface-border text-xs text-white font-medium transition-colors"
          >
            {maskingDemoRevealed ? 'Simulate Masked State' : 'Simulate Verified Reveal'}
          </button>
        </div>
      </div>

      {/* Tamper-Evident Audit Trail */}
      <div className="glass-panel p-6 rounded-2xl border border-surface-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Immutable Contact Reveal Audit Log
            </h3>
            <p className="text-xs text-slate-400">
              Every contact reveal is cryptographically tagged with timestamp, authorized actor, and request reference.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
              className="w-full bg-surface-elevated border border-surface-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-surface-border text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3">TIMESTAMP (UTC)</th>
                <th className="py-2.5 px-3">ACTION</th>
                <th className="py-2.5 px-3">AUTHORIZED ACTOR</th>
                <th className="py-2.5 px-3">REQUEST ID</th>
                <th className="py-2.5 px-3">DONOR REF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/50 text-slate-300 font-mono">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-elevated/40">
                    <td className="py-2.5 px-3 text-slate-400">{log.timestamp.slice(0, 19).replace('T', ' ')}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">{log.action}</td>
                    <td className="py-2.5 px-3 text-white">{log.actor}</td>
                    <td className="py-2.5 px-3 text-cyan">{log.requestId}</td>
                    <td className="py-2.5 px-3 text-amber">{log.donorId || 'N/A'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No contact reveals logged yet. Accept a request in Phone Mock to trigger an audit record.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulated System Notice */}
      <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong>Medical &amp; Regulatory Disclaimer:</strong> RaktSetu is a real-time donor discovery and coordination aid. Transfusion compatibility, donor physical eligibility, infectious disease screening, and blood grouping are exclusively performed and certified by licensed medical staff and hospital blood banks. All phone numbers and donor profiles displayed in this demo are fictional synthetic data.
        </div>
      </div>
    </div>
  );
};
