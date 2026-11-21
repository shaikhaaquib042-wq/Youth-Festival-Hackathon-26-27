import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSanitrack } from '../context/SanitrackContext';
import { useAuth } from '../context/AuthContext';
import { formatTimeAgo } from '../lib/utils';
import { ComplaintStatus } from '../types';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  Building,
  HeartHandshake,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

const STATUS_STEPS: { id: ComplaintStatus; label: string }[] = [
  { id: 'submitted', label: 'Submitted' },
  { id: 'triage', label: 'Triage' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
];

export const TrackComplaintPage: React.FC = () => {
  const { reference } = useParams<{ reference?: string }>();
  const navigate = useNavigate();
  const { complaints, updateComplaintStatus } = useSanitrack();
  const { currentRole } = useAuth();

  const [inputRef, setInputRef] = useState(reference || '');

  // Find active complaint
  const activeComplaint = complaints.find(
    (c) =>
      c.referenceCode.toLowerCase() === (reference || inputRef).trim().toLowerCase()
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputRef.trim()) {
      navigate(`/track/${inputRef.trim()}`);
    }
  };

  const getStepIndex = (status: ComplaintStatus) => {
    if (status === 'resolved_pending_verification') return 3;
    const idx = STATUS_STEPS.findIndex((s) => s.id === status);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Public Grievance Tracker
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          Sanitized, transparent tracking of public sanitation complaints in Pune without disclosing private reporter personal data.
        </p>
      </div>

      {/* Search by Reference Box */}
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 p-2 bg-white rounded-2xl shadow-xs border border-slate-200"
      >
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={inputRef}
            onChange={(e) => setInputRef(e.target.value)}
            placeholder="Enter reference code (e.g. SAN-PUN-2024-1042)..."
            className="w-full pl-12 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none font-mono"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
        >
          Track Status
        </button>
      </form>

      {/* If complaint found */}
      {activeComplaint ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-8 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  {activeComplaint.referenceCode}
                </span>
                <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {activeComplaint.priority} Priority
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {activeComplaint.category}
              </h2>
              <div className="text-xs text-slate-500 mt-0.5">
                Facility: <strong>{activeComplaint.toiletName}</strong>
              </div>
            </div>

            <div className="text-right sm:text-right">
              <div className="text-xs text-slate-400">Reported On</div>
              <div className="text-xs font-semibold text-slate-700">
                {new Date(activeComplaint.createdAt).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div className="text-[11px] text-slate-400 italic">
                {formatTimeAgo(activeComplaint.createdAt)}
              </div>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="py-2">
            <div className="text-xs font-bold text-slate-700 mb-4 uppercase tracking-wider">
              Resolution Progress Workflow
            </div>

            <div className="grid grid-cols-5 gap-2 relative">
              {STATUS_STEPS.map((step, idx) => {
                const currentIdx = getStepIndex(activeComplaint.status);
                const isComplete = idx <= currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <div key={step.id} className="text-center space-y-2 relative">
                    <div
                      className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isCurrent
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-md scale-110'
                          : isComplete
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isComplete && !isCurrent ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <div
                      className={`text-[11px] font-bold ${
                        isCurrent
                          ? 'text-emerald-700'
                          : isComplete
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description & Metadata Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Issue Description
              </span>
              <p className="text-sm text-slate-800 mt-1 leading-relaxed">
                "{activeComplaint.description}"
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/60 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block">Reported By:</span>
                <strong className="text-slate-800">
                  {activeComplaint.isAnonymous ? 'Anonymous Citizen' : activeComplaint.reporterName}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Assigned Staff / Ward:</span>
                <strong className="text-slate-800">
                  {activeComplaint.assignedToName || 'Under Ward Triage'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Target SLA Deadline:</span>
                <strong className="text-slate-800">
                  {activeComplaint.dueDate
                    ? new Date(activeComplaint.dueDate).toLocaleDateString('en-IN')
                    : '24-48 Hours'}
                </strong>
              </div>
            </div>
          </div>

          {/* Linked Rotary Campaign Banner if applicable */}
          {activeComplaint.campaignId && (
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-950">
                    Community Maintenance Campaign Active
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    This repair is supported transparently by Rotary Club of Pune Midtown & public pledges.
                  </div>
                </div>
              </div>

              <Link
                to={`/campaigns/${activeComplaint.campaignId}`}
                className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 shrink-0 transition-colors"
              >
                View Campaign & Invoices &rarr;
              </Link>
            </div>
          )}

          {/* Immutable Audit Events Log */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Official Audit Timeline ({activeComplaint.events.length} events logged)
            </h3>

            <div className="relative pl-6 space-y-4 border-l-2 border-slate-200">
              {activeComplaint.events.map((ev) => (
                <div key={ev.id} className="relative">
                  <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900">
                      Status updated to{' '}
                      <span className="text-emerald-700 uppercase font-mono">
                        {ev.newStatus}
                      </span>{' '}
                      by {ev.actorName} ({ev.actorRole})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatTimeAgo(ev.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{ev.notes}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Citizen Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/find"
              className="text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              &larr; Back to Pune Map
            </Link>

            {activeComplaint.status === 'resolved' && (
              <button
                onClick={() => {
                  updateComplaintStatus(
                    activeComplaint.id,
                    'reopened',
                    'Citizen flagged that issue recurred; reopened for municipal review.'
                  );
                  alert('Complaint reopened and escalated to Ward Officer.');
                }}
                className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Issue Not Resolved? Reopen</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* List of recent sample complaints to browse */
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800">
            Recent Public Grievances in Pune Pilot Area
          </h3>
          <p className="text-xs text-slate-500">
            Click any reference code below to inspect its public verification timeline:
          </p>

          <div className="space-y-3">
            {complaints.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/track/${c.referenceCode}`)}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded">
                      {c.referenceCode}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {c.toiletName}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">{c.category}</div>
                  <p className="text-xs text-slate-500 line-clamp-1">{c.description}</p>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                      c.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : c.status === 'in_progress'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {c.status.replace('_', ' ')}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {formatTimeAgo(c.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
