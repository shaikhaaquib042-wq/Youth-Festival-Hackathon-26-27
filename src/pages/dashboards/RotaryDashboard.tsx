import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSanitrack } from '../../context/SanitrackContext';
import { useAuth } from '../../context/AuthContext';
import {
  HeartHandshake,
  TrendingUp,
  Receipt,
  Plus,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react';

export const RotaryDashboard: React.FC = () => {
  const {
    campaigns,
    complaints,
    toilets,
    createCampaignFromComplaint,
  } = useSanitrack();
  const { currentUser } = useAuth();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedCompId, setSelectedCompId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTarget, setNewTarget] = useState(15000);

  // Eligible complaints nominated for funding
  const eligibleComplaints = complaints.filter(
    (c) => c.status !== 'resolved' && !c.campaignId
  );

  const totalRaised = campaigns.reduce((acc, c) => acc + c.raisedAmount, 0);
  const totalSpent = campaigns.reduce((acc, c) => acc + c.spentAmount, 0);

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc || newTarget <= 0) return;

    createCampaignFromComplaint(
      selectedCompId || 'comp-general',
      newTitle,
      newDesc,
      newTarget,
      currentUser.organizationName || 'Rotary Club of Pune Midtown'
    );

    setCreateModalOpen(false);
    setNewTitle('');
    setNewDesc('');
    alert('Campaign successfully launched and published to public transparency page!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 text-white flex items-center justify-center font-black text-2xl shadow-sm">
            🤝
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black">{currentUser.fullName}</h1>
              <span className="bg-pink-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Funding Partner Desk
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentUser.organizationName || 'Rotary Club of Pune Midtown'} · WASH Committee
            </p>
          </div>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Launch Maintenance Campaign</span>
        </button>
      </div>

      {/* Financial Health & Impact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-400 font-bold uppercase">Mobilized Funds</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            ₹{totalRaised.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">Citizen & Rotary Grants</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-400 font-bold uppercase">Audited Expenses</div>
          <div className="text-2xl font-black text-slate-800 mt-1">
            ₹{totalSpent.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">Itemized Contractor Invoices</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-400 font-bold uppercase">Active Projects</div>
          <div className="text-2xl font-black text-indigo-700 mt-1">
            {campaigns.filter((c) => c.status === 'active').length}
          </div>
          <div className="text-[11px] text-slate-500">Under Execution</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-400 font-bold uppercase">Completed Projects</div>
          <div className="text-2xl font-black text-teal-700 mt-1">
            {campaigns.filter((c) => c.status === 'completed').length}
          </div>
          <div className="text-[11px] text-slate-500">Publicly Certified Repairs</div>
        </div>
      </div>

      {/* Campaigns Overview */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Rotary Community Campaigns Portfolio
            </h2>
            <p className="text-xs text-slate-500">
              Manage funding milestones, approve vendor quotes, and view live pledges
            </p>
          </div>

          <Link
            to="/campaigns"
            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
          >
            <span>View Public Transparency Feed</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-4">
          {campaigns.map((camp) => {
            const percent = Math.min(100, Math.round((camp.raisedAmount / camp.targetAmount) * 100));
            return (
              <div
                key={camp.id}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 sm:max-w-xl">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        camp.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {camp.status}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {camp.toiletName}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{camp.title}</h3>
                  <div className="text-xs text-slate-500 line-clamp-1">{camp.description}</div>
                </div>

                <div className="sm:text-right shrink-0 space-y-1">
                  <div className="text-sm font-black text-slate-900">
                    ₹{camp.raisedAmount.toLocaleString()} / ₹{camp.targetAmount.toLocaleString()}
                  </div>
                  <div className="text-xs text-emerald-700 font-bold">{percent}% Funded</div>
                  <Link
                    to={`/campaigns/${camp.id}`}
                    className="inline-block mt-2 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Manage Ledger &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Eligible Grievances Nominated for Funding */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          <span>Eligible Municipal Grievances Pending Sponsorship</span>
        </h2>
        <p className="text-xs text-slate-500">
          These issues have been verified by municipal ward officers but require community funding support.
        </p>

        <div className="space-y-3">
          {eligibleComplaints.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                    {c.referenceCode}
                  </span>
                  <span className="text-xs font-bold text-slate-800">{c.toiletName}</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{c.category}</div>
                <p className="text-xs text-slate-600">{c.description}</p>
              </div>

              <button
                onClick={() => {
                  setSelectedCompId(c.id);
                  setNewTitle(`Repair & Overhaul: ${c.category} at ${c.toiletName}`);
                  setNewDesc(`Verified municipal need: ${c.description}`);
                  setCreateModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 transition-colors"
              >
                Create Sponsorship Campaign
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Create Campaign Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                Launch Approved Maintenance Campaign
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Select Facility or Grievance
                </label>
                <select
                  value={selectedCompId}
                  onChange={(e) => setSelectedCompId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                >
                  <option value="">General Facility Maintenance</option>
                  {complaints.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.referenceCode} - {c.toiletName} ({c.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Campaign Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Sanitary Pad Dispenser Installation at Deccan Station"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Description & Justification *
                </label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Explain why this project is important and what parts will be purchased..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Budget (₹) *</label>
                <input
                  type="number"
                  min={1000}
                  value={newTarget}
                  onChange={(e) => setNewTarget(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Approve & Launch Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
