import React from 'react';
import { Link } from 'react-router-dom';
import { useSanitrack } from '../../context/SanitrackContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ToiletCard } from '../../components/toilet/ToiletCard';
import { formatTimeAgo } from '../../lib/utils';
import {
  User,
  Heart,
  AlertOctagon,
  HeartHandshake,
  Clock,
  Compass,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const CitizenDashboard: React.FC = () => {
  const { toilets, complaints, campaigns, favorites } = useSanitrack();
  const { currentUser } = useAuth();

  const savedToilets = toilets.filter((t) => favorites.includes(t.id));
  const myComplaints = complaints; // In demo mode, citizen can see their submissions

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-2xl shadow-sm">
            {currentUser.fullName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {currentUser.fullName}
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                Active Citizen
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentUser.email || 'Citizen Contributor'} · Pune Pilot Zone
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/report"
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Report New Grievance</span>
          </Link>
          <Link
            to="/find"
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-colors"
          >
            <Compass className="w-4 h-4" />
            <span>Find Toilets</span>
          </Link>
        </div>
      </div>

      {/* Grid: Saved Toilets & Grievance History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: My Grievances */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertOctagon className="w-5 h-5 text-rose-600" />
                  <span>My Sanitation Grievance Reports</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Track municipal SLA and operator repair verification in real-time
                </p>
              </div>

              <Link
                to="/report"
                className="text-xs font-bold text-rose-600 hover:text-rose-700"
              >
                + New Report
              </Link>
            </div>

            <div className="space-y-3">
              {myComplaints.map((c) => (
                <div
                  key={c.id}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                        {c.referenceCode}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {c.toiletName}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">{c.category}</div>
                    <p className="text-xs text-slate-500 line-clamp-1">{c.description}</p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        c.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'in_progress'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                    <Link
                      to={`/track/${c.referenceCode}`}
                      className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 mt-1"
                    >
                      <span>Track</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Facilities */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
              <span>Saved Favorite Facilities ({savedToilets.length})</span>
            </h2>

            {savedToilets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
                You haven't saved any favorite facilities yet. Tap the heart icon on any toilet card to keep it handy!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {savedToilets.map((toilet) => (
                  <ToiletCard key={toilet.id} toilet={toilet} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Civic Contributions */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-6 border border-emerald-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-base">
              <HeartHandshake className="w-5 h-5 text-emerald-600" />
              <span>Civic Maintenance Pledges</span>
            </div>

            <p className="text-xs text-emerald-800 leading-relaxed">
              Transparent community contributions supporting public toilet repairs in Pune alongside Rotary Club of Pune Midtown.
            </p>

            <div className="p-4 bg-white rounded-2xl border border-emerald-100 space-y-2">
              <div className="text-xs text-slate-400 font-bold uppercase">Total Pledged</div>
              <div className="text-2xl font-black text-emerald-700">₹1,500</div>
              <div className="text-[11px] text-slate-500">Demo Pledges in Escrow</div>
            </div>

            <Link
              to="/campaigns"
              className="block text-center w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
            >
              Browse Active Projects &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
