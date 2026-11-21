import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSanitrack } from '../../context/SanitrackContext';
import { UserRole } from '../../types';
import { ShieldAlert, RefreshCw, UserCheck, Sparkles } from 'lucide-react';

const ROLES: { id: UserRole; label: string; icon: string; desc: string }[] = [
  { id: 'citizen', label: 'Citizen', icon: '👤', desc: 'Riya Sharma (Citizen reporter)' },
  { id: 'operator', label: 'Toilet Operator', icon: '🛠️', desc: 'Santosh Kadam (FC Road Attendant)' },
  { id: 'worker', label: 'Sanitation Worker', icon: '🧹', desc: 'Raju Jadhav (Cleaning Crew)' },
  { id: 'municipal_officer', label: 'Municipal Officer', icon: '🏛️', desc: 'K. Deshmukh (PMC Ward 12)' },
  { id: 'funding_partner', label: 'Rotary Partner', icon: '🤝', desc: 'Dr. Anita Roy (Pune Midtown)' },
  { id: 'admin', label: 'Admin', icon: '🛡️', desc: 'SaniTrack HQ Administrator' },
  { id: 'guest', label: 'Public Guest', icon: '👁️', desc: 'Unregistered visitor' },
];

export const DemoBanner: React.FC = () => {
  const { currentRole, switchRole, currentUser } = useAuth();
  const { resetToDemoDefaults } = useSanitrack();

  return (
    <div className="bg-slate-900 text-slate-100 text-xs py-2 px-3 sm:px-6 border-b border-slate-800">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-2.5">
        {/* Prototype Warning */}
        <div className="flex items-center gap-2 text-slate-300">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-emerald-400 uppercase tracking-wide">
            Hackathon Prototype
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="text-slate-300 text-center sm:text-left">
            Pune Pilot Demonstration · Clearly labeled sample & operator data
          </span>
        </div>

        {/* Instant Role Switcher Toolbar */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Switch Persona:
          </span>
          {ROLES.map((role) => {
            const isActive = currentRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => switchRole(role.id)}
                title={role.desc}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1 ${
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm ring-1 ring-emerald-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <span>{role.icon}</span>
                <span>{role.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => {
              if (window.confirm('Reset all demo complaints, tasks, and status changes back to defaults?')) {
                resetToDemoDefaults();
              }
            }}
            className="ml-2 px-2 py-1 rounded bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 text-slate-400 border border-slate-700 transition-colors flex items-center gap-1"
            title="Reset to default seed state"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden md:inline">Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
