import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSanitrack } from '../context/SanitrackContext';
import { Campaign } from '../types';
import confetti from 'canvas-confetti';
import {
  HeartHandshake,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle2,
  Receipt,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react';

export const CampaignsPage: React.FC = () => {
  const { campaigns, makeDemoPledge } = useSanitrack();
  const [pledgeModalCampaign, setPledgeModalCampaign] = useState<Campaign | null>(null);
  const [donorName, setDonorName] = useState('');
  const [pledgeAmount, setPledgeAmount] = useState(500);
  const [pledgeMessage, setPledgeMessage] = useState('');
  const [pledgeSuccess, setPledgeSuccess] = useState(false);

  const handlePledgeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pledgeModalCampaign || pledgeAmount <= 0) return;

    makeDemoPledge(
      pledgeModalCampaign.id,
      donorName || 'Civic Supporter',
      pledgeAmount,
      pledgeMessage
    );

    // Fire celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err) {}

    setPledgeSuccess(true);
    setTimeout(() => {
      setPledgeSuccess(false);
      setPledgeModalCampaign(null);
      setDonorName('');
      setPledgeMessage('');
    }, 2500);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 pb-24">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-5 sm:p-7 border border-emerald-800/40 shadow-sm space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
          <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />
          <span>Community & Rotary Sanitation Fund</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Public Maintenance & Upgrade Projects
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Open transparency portal where citizens, Rotary partners, donors, and municipal officers can review public toilet repair needs, inspect contractor receipts, and pledge support.
        </p>

        <div className="p-2.5 bg-emerald-950/80 rounded-xl border border-emerald-800/60 text-[11px] text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Every rupee raised is publicly reconciled against contractor invoices and verified work photos.
          </span>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaigns.map((camp) => {
          const percent = Math.min(100, Math.round((camp.raisedAmount / camp.targetAmount) * 100));
          const remaining = Math.max(0, camp.targetAmount - camp.raisedAmount);

          return (
            <div
              key={camp.id}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${
                      camp.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}
                  >
                    {camp.status === 'completed' ? 'Fully Funded & Verified' : 'Active Campaign'}
                  </span>

                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {camp.startDate}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-snug">
                    {camp.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{camp.locality}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {camp.description}
                </p>

                {/* Progress Bar */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-700">
                      ₹{camp.raisedAmount.toLocaleString()} ({percent}%)
                    </span>
                    <span className="text-slate-500">
                      Goal: ₹{camp.targetAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        camp.status === 'completed'
                          ? 'bg-emerald-600'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{camp.donations.length} civic pledges</span>
                    <span>
                      {remaining === 0
                        ? '🎉 Target reached!'
                        : `₹${remaining.toLocaleString()} remaining`}
                    </span>
                  </div>
                </div>

                {/* Partner Credit */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                  <span>Supporting Partner:</span>
                  <strong className="text-slate-900">{camp.partnerOrganizationName}</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <Link
                  to={`/campaigns/${camp.id}`}
                  className="text-xs font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5 text-slate-400" />
                  <span>Itemized Ledger ({camp.expenses.length} invoices)</span>
                </Link>

                <div className="flex items-center gap-2">
                  {camp.status !== 'completed' && (
                    <button
                      onClick={() => setPledgeModalCampaign(camp)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all"
                    >
                      Demo Pledge
                    </button>
                  )}
                  <Link
                    to={`/campaigns/${camp.id}`}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    View &rarr;
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Demo Pledge Modal */}
      {pledgeModalCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
                <HeartHandshake className="w-5 h-5 text-emerald-600" />
                <span>Simulated Community Contribution</span>
              </div>
              <button
                onClick={() => setPledgeModalCampaign(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pledgeSuccess ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                <h4 className="font-bold text-lg text-slate-900">
                  Demo Pledge Confirmed!
                </h4>
                <p className="text-xs text-slate-500">
                  ₹{pledgeAmount} added to {pledgeModalCampaign.title}. Thank you for supporting civic sanitation!
                </p>
              </div>
            ) : (
              <form onSubmit={handlePledgeSubmit} className="space-y-4 text-xs">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px]">
                  <strong>DEMO MODE:</strong> No real money will be charged. This demonstrates the Rotary community crowdfunding workflow.
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Your Name (or leave blank for Anonymous)
                  </label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Pledge Amount (₹)
                  </label>
                  <div className="flex gap-2 mb-2">
                    {[200, 500, 1000, 2500].map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setPledgeAmount(amt)}
                        className={`flex-1 py-1.5 rounded-lg font-bold border transition-all ${
                          pledgeAmount === amt
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={50}
                    value={pledgeAmount}
                    onChange={(e) => setPledgeAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Public Encouragement Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={pledgeMessage}
                    onChange={(e) => setPledgeMessage(e.target.value)}
                    placeholder="e.g. Glad to help restore this facility!"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPledgeModalCampaign(null)}
                    className="px-4 py-2 text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-xs"
                  >
                    Confirm Demo Pledge (₹{pledgeAmount})
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
