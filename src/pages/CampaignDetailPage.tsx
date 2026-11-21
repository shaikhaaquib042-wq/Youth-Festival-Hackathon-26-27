import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSanitrack } from '../context/SanitrackContext';
import { useAuth } from '../context/AuthContext';
import { formatTimeAgo } from '../lib/utils';
import {
  HeartHandshake,
  Receipt,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  TrendingUp,
  User,
  ArrowLeft,
  Plus,
  ShieldCheck,
  DollarSign,
} from 'lucide-react';

export const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    campaigns,
    addCampaignExpense,
    addCampaignMilestone,
    makeDemoPledge,
  } = useSanitrack();
  const { currentRole } = useAuth();

  const campaign = campaigns.find((c) => c.id === id);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseVendor, setExpenseVendor] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(2500);
  const [expenseInvoice, setExpenseInvoice] = useState('');

  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneContent, setMilestoneContent] = useState('');

  if (!campaign) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Project Not Found</h2>
        <Link
          to="/campaigns"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Campaigns</span>
        </Link>
      </div>
    );
  }

  const percent = Math.min(100, Math.round((campaign.raisedAmount / campaign.targetAmount) * 100));
  const remaining = Math.max(0, campaign.targetAmount - campaign.raisedAmount);
  const isPartnerOrAdmin = true; // Open to donors, Rotary members, and municipal governors

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc || !expenseVendor || expenseAmount <= 0) return;
    addCampaignExpense(
      campaign.id,
      expenseDesc,
      expenseVendor,
      expenseAmount,
      expenseInvoice || `INV-${Date.now().toString().slice(-5)}`
    );
    setExpenseModalOpen(false);
    setExpenseDesc('');
    setExpenseVendor('');
  };

  const handleMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle || !milestoneContent) return;
    addCampaignMilestone(campaign.id, milestoneTitle, milestoneContent);
    setMilestoneModalOpen(false);
    setMilestoneTitle('');
    setMilestoneContent('');
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 space-y-5 pb-24">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Projects</span>
        </button>

        {isPartnerOrAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpenseModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Contractor Invoice</span>
            </button>
            <button
              onClick={() => setMilestoneModalOpen(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post Progress Update</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Campaign Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${
                  campaign.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                {campaign.status === 'completed' ? 'Completed & Repaired' : 'Active Crowdfunding'}
              </span>
              <span className="text-xs text-slate-500">
                Partner: <strong>{campaign.partnerOrganizationName}</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {campaign.title}
            </h1>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Facility: <strong className="text-slate-800">{campaign.toiletName}</strong></span>
              <span>· {campaign.locality}</span>
            </div>
          </div>

          <div className="text-right sm:text-right shrink-0">
            <div className="text-xs text-slate-400">Target Budget</div>
            <div className="text-2xl font-black text-slate-900">
              ₹{campaign.targetAmount.toLocaleString()}
            </div>
            <div className="text-xs text-emerald-600 font-bold">
              ₹{campaign.raisedAmount.toLocaleString()} raised ({percent}%)
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 pt-2">
          <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>₹{campaign.spentAmount.toLocaleString()} spent & audited</span>
            <span>
              ₹{Math.max(0, campaign.raisedAmount - campaign.spentAmount).toLocaleString()} balance in escrow
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
          {campaign.description}
        </p>
      </div>

      {/* Invoices & Expense Transparency Ledger */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <span>Public Expenditure & Contractor Receipts Ledger</span>
            </h3>
            <p className="text-xs text-slate-500">
              Every rupee spent is verified with supplier invoices and approval signatures
            </p>
          </div>

          <span className="font-mono text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
            Total Spent: ₹{campaign.spentAmount.toLocaleString()}
          </span>
        </div>

        {campaign.expenses.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
            No expenses recorded yet. Invoices will appear here as procurement starts.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Vendor / Contractor</th>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Approved By</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {campaign.expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-slate-500">
                      {new Date(exp.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-3 font-semibold text-slate-900">{exp.description}</td>
                    <td className="p-3">{exp.vendorName}</td>
                    <td className="p-3 font-mono text-emerald-700">{exp.invoiceNumber}</td>
                    <td className="p-3">{exp.approvedByName}</td>
                    <td className="p-3 text-right font-black text-slate-900">
                      ₹{exp.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Updates Timeline & Donors list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Milestone Updates */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <span>Progress Milestones ({campaign.updates.length})</span>
          </h3>

          <div className="space-y-4 relative pl-4 border-l-2 border-slate-200">
            {campaign.updates.map((up) => (
              <div key={up.id} className="relative">
                <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-white" />
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">{up.title}</h4>
                  <span className="text-[10px] text-slate-400">{formatTimeAgo(up.createdAt)}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{up.content}</p>
                <div className="text-[10px] text-slate-400 mt-1">Posted by: {up.postedByName}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Community Contributors / Donors */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-pink-600" />
            <span>Civic Pledges ({campaign.donations.length})</span>
          </h3>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {campaign.donations.map((don) => (
              <div
                key={don.id}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{don.donorName}</div>
                  {don.message && (
                    <div className="text-[11px] text-slate-500 italic">"{don.message}"</div>
                  )}
                  <div className="text-[10px] text-slate-400">
                    {formatTimeAgo(don.createdAt)} · {don.paymentProvider}
                  </div>
                </div>
                <div className="text-right font-black text-emerald-700 text-sm">
                  ₹{don.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Record Expense Modal */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Record Approved Contractor Expense
            </h3>

            <form onSubmit={handleExpenseSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Expense Description *</label>
                <input
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="e.g. 1.5-inch CPVC plumbing fittings & valve"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vendor / Store Name *</label>
                <input
                  type="text"
                  value={expenseVendor}
                  onChange={(e) => setExpenseVendor(e.target.value)}
                  placeholder="e.g. Pune Hardware Mart, Deccan"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={expenseInvoice}
                    onChange={(e) => setExpenseInvoice(e.target.value)}
                    placeholder="INV-9921"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-xs"
                >
                  Save & Publish to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Milestone Modal */}
      {milestoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Post Milestone Update</h3>

            <form onSubmit={handleMilestoneSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Milestone Title *</label>
                <input
                  type="text"
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  placeholder="e.g. Plumber completed valve weld; water restored"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Details & Progress *</label>
                <textarea
                  rows={3}
                  value={milestoneContent}
                  onChange={(e) => setMilestoneContent(e.target.value)}
                  placeholder="Describe the current progress and verification results..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMilestoneModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-xs"
                >
                  Post Public Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
