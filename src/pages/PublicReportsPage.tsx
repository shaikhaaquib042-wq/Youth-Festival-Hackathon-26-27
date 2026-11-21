import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSanitrack } from '../context/SanitrackContext';
import { ComplaintStatus } from '../types';
import { formatTimeAgo } from '../lib/utils';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Filter,
  MapPin,
  ShieldCheck,
  Camera,
  ExternalLink,
} from 'lucide-react';

export const PublicReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { complaints } = useSanitrack();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');

  const resolvedCount = complaints.filter((c) => c.status === 'resolved').length;
  const inProgressCount = complaints.filter(
    (c) => c.status === 'in_progress' || c.status === 'assigned'
  ).length;
  const submittedCount = complaints.filter((c) => c.status === 'submitted' || c.status === 'triage').length;

  const filteredComplaints = complaints.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = c.referenceCode.toLowerCase().includes(q);
      const matchFacility = c.toiletName.toLowerCase().includes(q);
      const matchCategory = c.category.toLowerCase().includes(q);
      const matchDesc = c.description.toLowerCase().includes(q);
      if (!matchRef && !matchFacility && !matchCategory && !matchDesc) return false;
    }

    if (statusFilter === 'resolved' && c.status !== 'resolved') return false;
    if (
      statusFilter === 'in_progress' &&
      c.status !== 'in_progress' &&
      c.status !== 'assigned'
    )
      return false;
    if (
      statusFilter === 'open' &&
      c.status !== 'submitted' &&
      c.status !== 'triage'
    )
      return false;

    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>Public Sanitation Reports</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent live record of all citizen grievances across Pune public facilities
          </p>
        </div>

        <Link
          to="/report"
          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs self-start sm:self-auto flex items-center gap-1.5 transition-colors"
        >
          <span>+ Report New Issue</span>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
        <div
          onClick={() => setStatusFilter('open')}
          className={`p-2.5 sm:p-3 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'open'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-amber-200'
          }`}
        >
          <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">New Reports</div>
          <div className="text-lg sm:text-xl font-black text-amber-600 mt-0.5">
            {submittedCount}
          </div>
          <div className="text-[9px] text-slate-400">Awaiting Triage</div>
        </div>

        <div
          onClick={() => setStatusFilter('in_progress')}
          className={`p-2.5 sm:p-3 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'in_progress'
              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400/20'
              : 'bg-white border-slate-200 hover:border-indigo-200'
          }`}
        >
          <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">In Progress</div>
          <div className="text-lg sm:text-xl font-black text-indigo-700 mt-0.5">
            {inProgressCount}
          </div>
          <div className="text-[9px] text-slate-400">Assigned / Repairing</div>
        </div>

        <div
          onClick={() => setStatusFilter('resolved')}
          className={`p-2.5 sm:p-3 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'resolved'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Fixed & Verified</div>
          <div className="text-lg sm:text-xl font-black text-emerald-600 mt-0.5">
            {resolvedCount}
          </div>
          <div className="text-[9px] text-slate-400">Work Certified</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code (e.g. SAN-PUN), facility or issue..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto text-xs py-0.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All ({complaints.length})
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
              statusFilter === 'in_progress'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
              statusFilter === 'resolved'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {filteredComplaints.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-xs text-slate-500 border border-slate-200">
            No grievance reports matched your current filter.
          </div>
        ) : (
          filteredComplaints.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/track/${c.referenceCode}`)}
              className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer space-y-2.5"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[11px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {c.referenceCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        c.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'in_progress'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatTimeAgo(c.createdAt)}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 mt-1">
                    {c.category}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{c.toiletName}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                    {c.priority} SLA
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                "{c.description}"
              </p>

              {/* Resolution or Assignment Footer */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1 text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Assigned: <strong>{c.assignedToName || 'Under Ward Review'}</strong>
                </span>

                <span className="font-bold text-emerald-700 flex items-center gap-0.5 hover:underline">
                  <span>Track Full Timeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
