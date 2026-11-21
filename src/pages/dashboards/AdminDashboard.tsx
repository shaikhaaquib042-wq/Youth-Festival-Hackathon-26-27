import React from 'react';
import { useSanitrack } from '../../context/SanitrackContext';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Database,
  Users,
  Activity,
  Layers,
  CheckCircle2,
  RefreshCw,
  Server,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    toilets,
    complaints,
    campaigns,
    cleaningLogs,
    resetToDemoDefaults,
  } = useSanitrack();
  const { currentUser, isSupabaseConnected } = useAuth();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-sm">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black">{currentUser.fullName}</h1>
              <span className="bg-indigo-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                System Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              SaniTrack Master Administrative Console · Naya Bharat 2047 Platform
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (window.confirm('Reset all demo complaints, tasks, and data back to defaults?')) {
              resetToDemoDefaults();
            }
          }}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-200 hover:text-rose-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset All Demo State</span>
        </button>
      </div>

      {/* Backend & Supabase Status Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-500" />
              <span>Data Engine: {isSupabaseConnected ? 'Supabase Live Connected' : 'Pune Pilot Offline Demo Engine (LocalStorage)'}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isSupabaseConnected
                ? 'Full PostgreSQL PostGIS connection active.'
                : 'Running in self-contained demonstration mode with instant state synchronization.'}
            </p>
          </div>
        </div>

        <span className="font-mono text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded-lg">
          RLS: Enforced
        </span>
      </div>

      {/* Overview Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-400 font-bold uppercase">Toilets Registered</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{toilets.length}</div>
          <div className="text-[11px] text-slate-500">Pune Pilot Hub</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-400 font-bold uppercase">Total Grievances</div>
          <div className="text-2xl font-black text-rose-600 mt-1">{complaints.length}</div>
          <div className="text-[11px] text-slate-500">Citizen Reports</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-400 font-bold uppercase">Cleaning Shifts</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{cleaningLogs.length}</div>
          <div className="text-[11px] text-slate-500">Certified Logs</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-400 font-bold uppercase">Rotary Projects</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">{campaigns.length}</div>
          <div className="text-[11px] text-slate-500">Community Campaigns</div>
        </div>
      </div>

      {/* Facilities Audit Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Master Facility Directory Audit
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Facility Name</th>
                <th className="p-3">Locality</th>
                <th className="p-3">Status</th>
                <th className="p-3">Rating</th>
                <th className="p-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {toilets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50">
                  <td className="p-3 font-mono font-bold text-slate-900">{t.facilityCode}</td>
                  <td className="p-3 font-medium">{t.name}</td>
                  <td className="p-3 text-slate-500">{t.locality}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        t.currentStatus === 'open'
                          ? 'bg-emerald-100 text-emerald-800'
                          : t.currentStatus === 'under_maintenance'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {t.currentStatus}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-amber-600">{t.rating} ★</td>
                  <td className="p-3 text-slate-500 capitalize">{t.verificationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
