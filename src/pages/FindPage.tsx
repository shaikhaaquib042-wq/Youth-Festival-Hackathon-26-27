import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSanitrack } from '../context/SanitrackContext';
import { MOCK_WARDS } from '../lib/mockData';
import { ToiletMap } from '../components/map/ToiletMap';
import { ToiletCard } from '../components/toilet/ToiletCard';
import { ToiletFilterBar, FilterState } from '../components/toilet/ToiletFilterBar';
import { calculateDistanceKm } from '../lib/utils';
import { Toilet } from '../types';
import { Map, List, Layers, Compass, AlertCircle } from 'lucide-react';

export const FindPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { toilets, userLocation } = useSanitrack();

  const [selectedToiletId, setSelectedToiletId] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'both' | 'map' | 'list'>('both');

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: searchParams.get('q') || '',
    wardId: searchParams.get('ward') || '',
    onlyOpen: searchParams.get('filter') === 'open',
    hasWomenSection: searchParams.get('filter') === 'women',
    hasPadDispenser: searchParams.get('filter') === 'pads',
    isAccessible: searchParams.get('filter') === 'accessible',
    isFree: searchParams.get('filter') === 'free',
    hasRunningWater: false,
    sortBy: 'distance',
  });

  // Filter & Sort Toilets
  const filteredToilets = useMemo(() => {
    return toilets
      .filter((toilet) => {
        // Query search
        if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase();
          const matchName = toilet.name.toLowerCase().includes(q);
          const matchLoc = toilet.locality.toLowerCase().includes(q);
          const matchAddr = toilet.address.toLowerCase().includes(q);
          const matchCode = toilet.facilityCode.toLowerCase().includes(q);
          if (!matchName && !matchLoc && !matchAddr && !matchCode) return false;
        }

        // Ward filter
        if (filters.wardId && toilet.wardId !== filters.wardId) {
          return false;
        }

        // Only Open
        if (filters.onlyOpen && toilet.currentStatus !== 'open') {
          return false;
        }

        // Women section
        if (
          filters.hasWomenSection &&
          !toilet.sections.some((s) => s.sectionType === 'women')
        ) {
          return false;
        }

        // Pad dispenser
        if (
          filters.hasPadDispenser &&
          !toilet.sanitaryFacilities?.some(
            (sf) => sf.facilityType === 'pad_dispenser' && sf.availability
          )
        ) {
          return false;
        }

        // Wheelchair accessible
        if (filters.isAccessible && !toilet.facilities.wheelchairRamp) {
          return false;
        }

        // Free
        if (filters.isFree && toilet.entryFee > 0) {
          return false;
        }

        // Running water
        if (filters.hasRunningWater && !toilet.facilities.hasRunningWater) {
          return false;
        }

        return true;
      })
      .map((toilet) => ({
        ...toilet,
        distanceKm: calculateDistanceKm(
          userLocation.lat,
          userLocation.lng,
          toilet.latitude,
          toilet.longitude
        ),
      }))
      .sort((a, b) => {
        if (filters.sortBy === 'distance') {
          return (a.distanceKm || 0) - (b.distanceKm || 0);
        }
        if (filters.sortBy === 'rating') {
          return b.rating - a.rating;
        }
        if (filters.sortBy === 'verified') {
          return (
            new Date(b.lastVerifiedAt).getTime() -
            new Date(a.lastVerifiedAt).getTime()
          );
        }
        return 0;
      });
  }, [toilets, filters, userLocation]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Title & View Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Pune Toilet Discovery
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
              GPS Synchronized
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Explore live public toilets across Shivajinagar, FC Road, Swargate, Station, and Kothrud.
          </p>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'both'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Map & List</span>
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'map'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Map View</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'list'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List View</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <ToiletFilterBar
        filters={filters}
        onChange={setFilters}
        wards={MOCK_WARDS}
        resultCount={filteredToilets.length}
      />

      {/* Main Content Layout */}
      {filteredToilets.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            No toilets matched your current filters
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try clearing some filter toggles or searching for a different area like "FC Road", "Swargate", or "Station".
          </p>
          <button
            onClick={() =>
              setFilters({
                searchQuery: '',
                wardId: '',
                onlyOpen: false,
                hasWomenSection: false,
                hasPadDispenser: false,
                isAccessible: false,
                isFree: false,
                hasRunningWater: false,
                sortBy: 'distance',
              })
            }
            className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors inline-block"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div
          className={`grid gap-6 ${
            viewMode === 'both'
              ? 'grid-cols-1 lg:grid-cols-12'
              : 'grid-cols-1'
          }`}
        >
          {/* Map Column */}
          {(viewMode === 'both' || viewMode === 'map') && (
            <div
              className={`space-y-2 ${
                viewMode === 'both'
                  ? 'lg:col-span-7 lg:sticky lg:top-24 h-[420px] lg:h-[calc(100vh-160px)]'
                  : 'h-[600px]'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-emerald-600" />
                  Interactive Map (Pins colored by live status)
                </span>
                <span className="text-[11px] text-slate-400">
                  Green = Open · Orange = Maint · Red = Closed
                </span>
              </div>
              <ToiletMap
                toilets={filteredToilets}
                selectedToiletId={selectedToiletId}
                onSelectToilet={(t) => setSelectedToiletId(t.id)}
                userLocation={userLocation}
                height="100%"
              />
            </div>
          )}

          {/* List Column */}
          {(viewMode === 'both' || viewMode === 'list') && (
            <div
              className={`space-y-4 ${
                viewMode === 'both' ? 'lg:col-span-5' : ''
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span className="font-semibold text-slate-700">
                  Facility List ({filteredToilets.length} found)
                </span>
                <span className="text-[11px] text-slate-400">
                  Click to locate on map
                </span>
              </div>

              <div
                className={`grid gap-4 ${
                  viewMode === 'list'
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1'
                }`}
              >
                {filteredToilets.map((toilet) => (
                  <ToiletCard
                    key={toilet.id}
                    toilet={toilet}
                    isSelected={toilet.id === selectedToiletId}
                    onSelect={() => setSelectedToiletId(toilet.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
