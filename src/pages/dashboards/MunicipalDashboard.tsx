import React, { useState } from 'react';
import { useSanitrack } from '../../context/SanitrackContext';
import { useAuth } from '../../context/AuthContext';
import { ComplaintStatus, PriorityLevel } from '../../types';
import { formatTimeAgo } from '../../lib/utils';
import {
  Building2,
  AlertOctagon,
  Clock,
  CheckCircle2,
  UserCheck,
  HeartHandshake,
  ArrowRight,
  TrendingUp,
  MapPin,
  Filter,
} from 'lucide-react';

export const MunicipalDashboard: React.FC = () => {
  const {
    toilets,
    complaints,
    updateComplaintStatus,
    assignComplaint,
    createCampaignFromComplaint,
  } = useSanitrack();
  const { currentUser } = useAuth();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  // Assignment Modal State
  const [assignedOfficer, setAssignedOfficer] = useState('Santosh Kadam (Operator)');
  const [assignedPriority, setAssignedPriority] = useState<PriorityLevel>('high');
  const [assignedDueDate, setAssignedDueDate] = useState('2024-11-23');

  const filteredComplaints = complaints.filter((c) => {
    if (filterStatus === 'all') return true;
    return c.status === filterStatus;
  });

  const activeComplaint = complaints.find((c) => c.id === selectedComplaintId);

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaintId) return;
    assignComplaint(selectedComplaintId, assignedOfficer, assignedPriority, assignedDueDate);
    alert(`Complaint ${activeComplaint?.referenceCode} assigned to ${assignedOfficer}`);
  };

  const handleNominateForRotary = (comp: typeof complaints[0]) => {
    if (
      window.confirm(
        `Nominate grievance "${comp.category}" at ${comp.toiletName} for Rotary Community Maintenance Sponsorship?`
      )
    ) {
      createCampaignFromComplaint(
        comp.id,
        `Emergency Repair: ${comp.category} at ${comp.toiletName}`,
        `Sanitation maintenance project approved by PMC Ward Office following citizen grievance: "${comp.description}".`,
        15000,
        'Rotary Club of Pune Midtown & Community Partners'
      );
      alert('Grievance nominated and campaign created in Community Funding Desk!');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-sm">
            🏛️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black">{currentUser.fullName}</h1>
              <span className="bg-teal-400 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Ward Officer (PMC)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pune Municipal Corporation · Solid Waste & Public Sanitation Oversight
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-center">
          <div className="p-3 bg-slate-800 rounded-2xl">
            <div className="text-xs text-slate-400">Total Wards</div>
            <div className="text-xl font-black text-teal-300">5 Pilot Zones</div>
          </div>
          <div className="p-3 bg-slate-800 rounded-2xl">
            <div className="text-xs text-slate-400">Open Inquiries</div>
            <div className="text-xl font-black text-rose-400">
              {complaints.filter((c) => c.status !== 'resolved').length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: Complaint Inbox & Triage Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Complaint Inbox (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Ward Grievance Triage Inbox
                </h2>
                <p className="text-xs text-slate-500">
                  Select any complaint to assign staff, set SLA, or approve resolution
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                {['all', 'submitted', 'assigned', 'in_progress', 'resolved'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                      filterStatus === st
                        ? 'bg-slate-900 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {filteredComplaints.map((c) => {
                const isSelected = c.id === selectedComplaintId;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedComplaintId(c.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          {c.referenceCode}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {c.toiletName}
                        </span>
                      </div>
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
                    </div>

                    <div className="text-sm font-bold text-slate-900">{c.category}</div>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{c.description}</p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 mt-2 border-t border-slate-200/60">
                      <span>Reported by: {c.isAnonymous ? 'Anonymous' : c.reporterName}</span>
                      <span>Assigned: {c.assignedToName || 'Unassigned'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Triage & Action Workspace (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {activeComplaint ? (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5 animate-fade-in">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Active Grievance Triage
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {activeComplaint.category}
                </h3>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  Ref: {activeComplaint.referenceCode}
                </div>
              </div>

              {/* Triage Assign Form */}
              <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Assign Field Operator / Sanitation Agency *
                  </label>
                  <select
                    value={assignedOfficer}
                    onChange={(e) => setAssignedOfficer(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="Santosh Kadam (Operator - FC Road / Deccan)">
                      Santosh Kadam (Operator - FC Road / Deccan)
                    </option>
                    <option value="Raju Jadhav (PMC Sanitation Crew Delta)">
                      Raju Jadhav (PMC Sanitation Crew Delta)
                    </option>
                    <option value="PMC Swargate Maintenance Depot">
                      PMC Swargate Maintenance Depot
                    </option>
                    <option value="Emergency Plumbing Contractor">
                      Emergency Plumbing Contractor
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Priority SLA
                    </label>
                    <select
                      value={assignedPriority}
                      onChange={(e) => setAssignedPriority(e.target.value as PriorityLevel)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                    >
                      <option value="urgent">Urgent (4 Hours)</option>
                      <option value="high">High (24 Hours)</option>
                      <option value="medium">Medium (48 Hours)</option>
                      <option value="low">Low (Routine)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={assignedDueDate}
                      onChange={(e) => setAssignedDueDate(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  Confirm Assignment & Notify Operator
                </button>
              </form>

              {/* Status Update Actions */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Officer Status Resolution
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      updateComplaintStatus(
                        activeComplaint.id,
                        'resolved',
                        `Official inspection by ${currentUser.fullName}. Resolution confirmed and verified on-site.`
                      )
                    }
                    className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Resolved</span>
                  </button>

                  <button
                    onClick={() =>
                      updateComplaintStatus(
                        activeComplaint.id,
                        'in_progress',
                        `Municipal inspection underway by ${currentUser.fullName}.`
                      )
                    }
                    className="p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors"
                  >
                    Set In Progress
                  </button>
                </div>
              </div>

              {/* Nominate for Rotary Community Crowdfunding */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                  <HeartHandshake className="w-4 h-4 text-emerald-600" />
                  <span>Rotary Partner Sponsorship</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-normal">
                  If this maintenance issue exceeds standard municipal operational budgets, you can approve it for Rotary Community Crowdfunding.
                </p>
                <button
                  onClick={() => handleNominateForRotary(activeComplaint)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
                >
                  Nominate for Rotary Campaign &rarr;
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs text-center space-y-3 text-slate-400">
              <Clock className="w-10 h-10 mx-auto text-slate-300" />
              <div className="text-sm font-bold text-slate-700">No Grievance Selected</div>
              <p className="text-xs max-w-xs mx-auto">
                Click on any complaint in the inbox on the left to assign field workers, set priority SLA, or nominate for Rotary funding.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
