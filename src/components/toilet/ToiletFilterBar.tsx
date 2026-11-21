import React from 'react';
import { Search, Filter, X, Sparkles, Accessibility, Droplets, Clock, DollarSign } from 'lucide-react';

export interface FilterState {
  searchQuery: string;
  wardId: string;
  onlyOpen: boolean;
  hasWomenSection: boolean;
  hasPadDispenser: boolean;
  isAccessible: boolean;
  isFree: boolean;
  hasRunningWater: boolean;
  sortBy: 'distance' | 'rating' | 'verified';
}

interface ToiletFilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  wards: { id: string; name: string }[];
  resultCount: number;
}

export const ToiletFilterBar: React.FC<ToiletFilterBarProps> = ({
  filters,
  onChange,
  wards,
  resultCount,
}) => {
  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  const activeToggleCount = [
    filters.onlyOpen,
    filters.hasWomenSection,
    filters.hasPadDispenser,
    filters.isAccessible,
    filters.isFree,
    filters.hasRunningWater,
    Boolean(filters.wardId),
  ].filter(Boolean).length;

  const resetFilters = () => {
    onChange({
      searchQuery: '',
      wardId: '',
      onlyOpen: false,
      hasWomenSection: false,
      hasPadDispenser: false,
      isAccessible: false,
      isFree: false,
      hasRunningWater: false,
      sortBy: 'distance',
    });
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs mb-6 space-y-4">
      {/* Top Search & Ward & Sort */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Search Input */}
        <div className="sm:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            placeholder="Search by area, landmark or facility name..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50"
          />
          {filters.searchQuery && (
            <button
              onClick={() => updateFilter('searchQuery', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Ward Selector */}
        <div className="sm:col-span-4">
          <select
            value={filters.wardId}
            onChange={(e) => updateFilter('wardId', e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50 text-slate-700 font-medium"
          >
            <option value="">All Municipal Wards (Pune Pilot)</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Selector */}
        <div className="sm:col-span-3">
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value as FilterState['sortBy'])}
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50 text-slate-700 font-medium"
          >
            <option value="distance">Nearest First (Distance)</option>
            <option value="rating">Highest Rated</option>
            <option value="verified">Recently Verified First</option>
          </select>
        </div>
      </div>

      {/* Pill Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          Filters:
        </span>

        {/* Open Now */}
        <button
          onClick={() => updateFilter('onlyOpen', !filters.onlyOpen)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
            filters.onlyOpen
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Open Now</span>
        </button>

        {/* Women's Section */}
        <button
          onClick={() => updateFilter('hasWomenSection', !filters.hasWomenSection)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
            filters.hasWomenSection
              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <span>👩</span>
          <span>Women’s Section</span>
        </button>

        {/* Pad Dispenser */}
        <button
          onClick={() => updateFilter('hasPadDispenser', !filters.hasPadDispenser)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
            filters.hasPadDispenser
              ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Sanitary Pad Dispenser</span>
        </button>

        {/* Wheelchair Accessible */}
        <button
          onClick={() => updateFilter('isAccessible', !filters.isAccessible)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
            filters.isAccessible
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Accessibility className="w-3.5 h-3.5" />
          <span>Wheelchair Ramp & Rails</span>
        </button>

        {/* Free Entry */}
        <button
          onClick={() => updateFilter('isFree', !filters.isFree)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
            filters.isFree
              ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Free Entry Only</span>
        </button>

        {/* Running Water */}
        <button
          onClick={() => updateFilter('hasRunningWater', !filters.hasRunningWater)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
            filters.hasRunningWater
              ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Droplets className="w-3.5 h-3.5" />
          <span>Running Water Verified</span>
        </button>

        {/* Clear All Button */}
        {activeToggleCount > 0 && (
          <button
            onClick={resetFilters}
            className="px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 font-semibold underline ml-auto"
          >
            Clear ({activeToggleCount})
          </button>
        )}
      </div>

      {/* Result Count Banner */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span>
          Showing <strong className="text-slate-800">{resultCount}</strong> public facilities in Pune Pilot Zone
        </span>
        <span className="italic text-[11px] text-slate-400">
          Source: PMC GeoDirectory & Operator Logs
        </span>
      </div>
    </div>
  );
};
