import React, { useState } from 'react';
import { useSanitrack } from '../../context/SanitrackContext';
import { useAuth } from '../../context/AuthContext';
import { ToiletStatus, StockStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Wrench,
  CheckCircle2,
  Droplets,
  Sparkles,
  Camera,
  Clock,
  AlertTriangle,
  ClipboardList,
  ShieldCheck,
  Save,
} from 'lucide-react';

export const OperatorDashboard: React.FC = () => {
  const {
    toilets,
    tasks,
    updateToiletStatus,
    updateToiletFacilities,
    updatePadStock,
    submitCleaningLog,
  } = useSanitrack();
  const { currentUser } = useAuth();

  // Assigned facilities for operator or first 2 for demo
  const assignedToilets = toilets.filter((t) =>
    currentUser.assignedToiletIds?.includes(t.id) || ['toilet-fc-road-she', 'toilet-deccan-park'].includes(t.id)
  );

  const [selectedToiletId, setSelectedToiletId] = useState(assignedToilets[0]?.id || toilets[0].id);
  const activeToilet = toilets.find((t) => t.id === selectedToiletId) || toilets[0];

  // Cleaning form state
  const [floorCleaned, setFloorCleaned] = useState(true);
  const [fixturesDisinfected, setFixturesDisinfected] = useState(true);
  const [waterChecked, setWaterChecked] = useState(true);
  const [soapRefilled, setSoapRefilled] = useState(true);
  const [wasteEmptied, setWasteEmptied] = useState(true);
  const [padStockChecked, setPadStockChecked] = useState(true);
  const [cleanNotes, setCleanNotes] = useState('');
  const [cleanSuccess, setCleanSuccess] = useState(false);

  const handleCleaningSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitCleaningLog({
      toiletId: activeToilet.id,
      toiletName: activeToilet.name,
      floorCleaned,
      fixturesDisinfected,
      waterChecked,
      soapRefilled,
      wasteEmptied,
      padStockChecked,
      notes: cleanNotes || 'Routine shift sanitization and audit completed.',
    });

    setCleanSuccess(true);
    setTimeout(() => setCleanSuccess(false), 3000);
    setCleanNotes('');
  };

  const padDispenser = activeToilet.sanitaryFacilities?.find(
    (sf) => sf.facilityType === 'pad_dispenser'
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Operator Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-sm">
            🛠️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black">{currentUser.fullName}</h1>
              <span className="bg-amber-400 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Field Operator & Crew
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentUser.organizationName || 'PMC Sanitation Agency'} · Zone 3 Central
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400">Assigned Units</div>
          <div className="text-lg font-black text-emerald-400">
            {assignedToilets.length} Public Restrooms
          </div>
        </div>
      </div>

      {/* Facility Switcher Tabs */}
      <div className="flex flex-wrap gap-2">
        {assignedToilets.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedToiletId(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              t.id === selectedToiletId
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{t.name.split(' ')[0]} Facility</span>
            <span className="font-mono text-[10px] opacity-80">({t.facilityCode})</span>
          </button>
        ))}
      </div>

      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Live Status & Utility Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Live Operational Status Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Live Status Control
                </span>
                <span className="text-xs text-slate-500">
                  Current: <StatusBadge status={activeToilet.currentStatus} size="sm" />
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                {activeToilet.name}
              </h2>
              <div className="text-xs text-slate-500">
                Freshness: <strong>{activeToilet.statusFreshness}</strong>
              </div>
            </div>

            {/* Quick Status Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() =>
                  updateToiletStatus(activeToilet.id, 'open', 'Sanitized & Fully Operational')
                }
                className={`py-3 px-2 rounded-2xl font-bold text-xs border transition-all flex flex-col items-center justify-center gap-1.5 ${
                  activeToilet.currentStatus === 'open'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                    : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Mark OPEN</span>
              </button>

              <button
                onClick={() =>
                  updateToiletStatus(activeToilet.id, 'under_maintenance', 'Plumbing or cleaning underway')
                }
                className={`py-3 px-2 rounded-2xl font-bold text-xs border transition-all flex flex-col items-center justify-center gap-1.5 ${
                  activeToilet.currentStatus === 'under_maintenance'
                    ? 'bg-orange-500 text-white border-orange-500 shadow-md ring-2 ring-orange-300'
                    : 'bg-slate-50 hover:bg-orange-50 text-slate-700 border-slate-200'
                }`}
              >
                <Wrench className="w-5 h-5" />
                <span>MAINTENANCE</span>
              </button>

              <button
                onClick={() =>
                  updateToiletStatus(activeToilet.id, 'closed', 'After-hours or emergency lock')
                }
                className={`py-3 px-2 rounded-2xl font-bold text-xs border transition-all flex flex-col items-center justify-center gap-1.5 ${
                  activeToilet.currentStatus === 'closed'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-300'
                    : 'bg-slate-50 hover:bg-rose-50 text-slate-700 border-slate-200'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
                <span>Mark CLOSED</span>
              </button>
            </div>
          </div>

          {/* Real-time Utility & Supplies Toggles */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-cyan-600" />
              <span>Real-Time Utility & Fixtures Control</span>
            </h3>

            <div className="space-y-3">
              {/* Running Water */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Mains Running Water</div>
                  <div className="text-[11px] text-slate-500">
                    {activeToilet.facilities.hasRunningWater ? 'Water supply confirmed' : 'Supply interrupted / Tank dry'}
                  </div>
                </div>
                <button
                  onClick={() =>
                    updateToiletFacilities(activeToilet.id, {
                      hasRunningWater: !activeToilet.facilities.hasRunningWater,
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeToilet.facilities.hasRunningWater
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {activeToilet.facilities.hasRunningWater ? 'Water Active' : 'Water OFF'}
                </button>
              </div>

              {/* Soap Availability */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Liquid Soap Dispenser</div>
                  <div className="text-[11px] text-slate-500">
                    {activeToilet.facilities.soapAvailable ? 'Bottles filled' : 'Bottles empty'}
                  </div>
                </div>
                <button
                  onClick={() =>
                    updateToiletFacilities(activeToilet.id, {
                      soapAvailable: !activeToilet.facilities.soapAvailable,
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeToilet.facilities.soapAvailable
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {activeToilet.facilities.soapAvailable ? 'Soap Stocked' : 'Empty'}
                </button>
              </div>

              {/* Lighting */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Interior & Approach Lighting</div>
                  <div className="text-[11px] text-slate-500">
                    {activeToilet.facilities.hasAdequateLighting ? 'All bulbs functioning' : 'Bulbs fused'}
                  </div>
                </div>
                <button
                  onClick={() =>
                    updateToiletFacilities(activeToilet.id, {
                      hasAdequateLighting: !activeToilet.facilities.hasAdequateLighting,
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeToilet.facilities.hasAdequateLighting
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {activeToilet.facilities.hasAdequateLighting ? 'Lighting OK' : 'Faulty'}
                </button>
              </div>
            </div>
          </div>

          {/* Sanitary Pad Dispenser Stock Toggler */}
          {padDispenser && (
            <div className="bg-pink-50/60 rounded-3xl p-6 border border-pink-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-pink-950 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pink-600" />
                  <span>Sanitary Pad Dispenser Inventory</span>
                </h3>
                <span className="text-xs font-bold text-pink-700">
                  Current: {padDispenser.currentStock.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['available', 'low', 'out_of_stock'] as StockStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => updatePadStock(activeToilet.id, st)}
                    className={`py-2 px-1 text-xs font-bold uppercase rounded-xl border transition-all ${
                      padDispenser.currentStock === st
                        ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                        : 'bg-white text-pink-950 border-pink-200 hover:bg-pink-100'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Daily Cleaning Checklist Submission (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              <span>Log Shift Cleaning Checklist</span>
            </h3>

            <p className="text-xs text-slate-500">
              Submitting updates the facility’s public freshness verification timestamp immediately.
            </p>

            {cleanSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Cleaning log submitted! Public freshness updated.</span>
              </div>
            )}

            <form onSubmit={handleCleaningSubmit} className="space-y-3 text-xs">
              <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={floorCleaned}
                  onChange={(e) => setFloorCleaned(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-800">
                  Floor washed, scrubbed & dried
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={fixturesDisinfected}
                  onChange={(e) => setFixturesDisinfected(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-800">
                  Commodes & urinals disinfected
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={waterChecked}
                  onChange={(e) => setWaterChecked(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-800">
                  Overhead tank & tap flow checked
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={soapRefilled}
                  onChange={(e) => setSoapRefilled(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-800">
                  Liquid soap dispenser refilled
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={wasteEmptied}
                  onChange={(e) => setWasteEmptied(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-800">
                  Waste bins & sanitary bins emptied
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={padStockChecked}
                  onChange={(e) => setPadStockChecked(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-800">
                  Pad dispenser coin slot & stock audited
                </span>
              </label>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Operator Inspection Notes
                </label>
                <textarea
                  rows={2}
                  value={cleanNotes}
                  onChange={(e) => setCleanNotes(e.target.value)}
                  placeholder="e.g. Morning round finished, chemical wash applied..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Submit & Certify Shift Log</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
