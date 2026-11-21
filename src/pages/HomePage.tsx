import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSanitrack } from '../context/SanitrackContext';
import { ToiletMap } from '../components/map/ToiletMap';
import { StatusBadge } from '../components/common/StatusBadge';
import { calculateDistanceKm, formatTimeAgo } from '../lib/utils';
import { Toilet } from '../types';
import {
  Search,
  MapPin,
  Navigation,
  Sparkles,
  Accessibility,
  Droplets,
  Clock,
  Heart,
  AlertOctagon,
  ChevronRight,
  X,
  List,
  Map as MapIcon,
  Crosshair,
  ShieldCheck,
  Star,
  CheckCircle2,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    toilets,
    userLocation,
    setUserLocation,
    isFavorite,
    toggleFavorite,
  } = useSanitrack();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToilet, setSelectedToilet] = useState<Toilet | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Quick Filters
  const [filterOpenOnly, setFilterOpenOnly] = useState(false);
  const [filterWomenOnly, setFilterWomenOnly] = useState(false);
  const [filterPadsOnly, setFilterPadsOnly] = useState(false);
  const [filterAccessibleOnly, setFilterAccessibleOnly] = useState(false);
  const [filterFreeOnly, setFilterFreeOnly] = useState(false);
  const [filterWaterOnly, setFilterWaterOnly] = useState(false);

  // Filtered Toilets
  const filteredToilets = useMemo(() => {
    return toilets
      .filter((toilet) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = toilet.name.toLowerCase().includes(q);
          const matchLoc = toilet.locality.toLowerCase().includes(q);
          const matchAddr = toilet.address.toLowerCase().includes(q);
          const matchCode = toilet.facilityCode.toLowerCase().includes(q);
          if (!matchName && !matchLoc && !matchAddr && !matchCode) return false;
        }

        if (filterOpenOnly && toilet.currentStatus !== 'open') return false;
        if (
          filterWomenOnly &&
          !toilet.sections.some((s) => s.sectionType === 'women')
        )
          return false;
        if (
          filterPadsOnly &&
          !toilet.sanitaryFacilities?.some(
            (sf) => sf.facilityType === 'pad_dispenser' && sf.availability
          )
        )
          return false;
        if (filterAccessibleOnly && !toilet.facilities.wheelchairRamp)
          return false;
        if (filterFreeOnly && toilet.entryFee > 0) return false;
        if (filterWaterOnly && !toilet.facilities.hasRunningWater) return false;

        return true;
      })
      .map((t) => ({
        ...t,
        distanceKm: calculateDistanceKm(
          userLocation.lat,
          userLocation.lng,
          t.latitude,
          t.longitude
        ),
      }))
      .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
  }, [
    toilets,
    searchQuery,
    filterOpenOnly,
    filterWomenOnly,
    filterPadsOnly,
    filterAccessibleOnly,
    filterFreeOnly,
    filterWaterOnly,
    userLocation,
  ]);

  const handleLocateMe = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          alert('GPS location updated to your current position!');
        },
        () => {
          alert('Unable to retrieve location. Defaulting to Pune City Center.');
        }
      );
    }
  };

  const openCount = toilets.filter((t) => t.currentStatus === 'open').length;

  return (
    <div className="relative flex-1 flex flex-col w-full h-full overflow-hidden bg-slate-100 pb-14 md:pb-0">
      {/* Top Floating Service Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-2.5 sm:px-6 py-1.5 space-y-1 shadow-xs z-30 shrink-0">
        {/* Search & Location Bar */}
        <div className="max-w-4xl mx-auto flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search area (e.g. FC Road, Swargate)..."
              className="w-full pl-8 pr-7 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* GPS Locate Me Button */}
          <button
            onClick={handleLocateMe}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
            title="Locate me via GPS"
          >
            <Crosshair className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Near Me</span>
          </button>

          {/* Map vs List Toggle Button */}
          <button
            onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-all shadow-xs"
          >
            {viewMode === 'map' ? (
              <>
                <List className="w-3.5 h-3.5" />
                <span className="text-xs">List</span>
              </>
            ) : (
              <>
                <MapIcon className="w-3.5 h-3.5" />
                <span className="text-xs">Map</span>
              </>
            )}
          </button>
        </div>

        {/* Horizontally Scrollable Fast Filter Pills */}
        <div className="max-w-4xl mx-auto flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-xs">
          <button
            onClick={() => setFilterOpenOnly(!filterOpenOnly)}
            className={`px-2.5 py-0.5 rounded-full font-semibold shrink-0 transition-all border text-[11px] ${
              filterOpenOnly
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            🟢 Open ({openCount})
          </button>

          <button
            onClick={() => setFilterWomenOnly(!filterWomenOnly)}
            className={`px-2.5 py-0.5 rounded-full font-semibold shrink-0 transition-all border text-[11px] ${
              filterWomenOnly
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            👩 Women
          </button>

          <button
            onClick={() => setFilterPadsOnly(!filterPadsOnly)}
            className={`px-2.5 py-0.5 rounded-full font-semibold shrink-0 transition-all border text-[11px] ${
              filterPadsOnly
                ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            ✨ Pads
          </button>

          <button
            onClick={() => setFilterAccessibleOnly(!filterAccessibleOnly)}
            className={`px-2.5 py-0.5 rounded-full font-semibold shrink-0 transition-all border text-[11px] ${
              filterAccessibleOnly
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            ♿ Accessible
          </button>

          <button
            onClick={() => setFilterWaterOnly(!filterWaterOnly)}
            className={`px-2.5 py-0.5 rounded-full font-semibold shrink-0 transition-all border text-[11px] ${
              filterWaterOnly
                ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            💧 Water
          </button>

          <button
            onClick={() => setFilterFreeOnly(!filterFreeOnly)}
            className={`px-2.5 py-0.5 rounded-full font-semibold shrink-0 transition-all border text-[11px] ${
              filterFreeOnly
                ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            🆓 Free
          </button>

          {(filterOpenOnly ||
            filterWomenOnly ||
            filterPadsOnly ||
            filterAccessibleOnly ||
            filterWaterOnly ||
            filterFreeOnly) && (
            <button
              onClick={() => {
                setFilterOpenOnly(false);
                setFilterWomenOnly(false);
                setFilterPadsOnly(false);
                setFilterAccessibleOnly(false);
                setFilterWaterOnly(false);
                setFilterFreeOnly(false);
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 px-1.5 shrink-0"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Service Area: Interactive Map vs List View */}
      {viewMode === 'map' ? (
        <div className="relative flex-1 w-full h-full overflow-hidden">
          {/* Direct Interactive Map */}
          <ToiletMap
            toilets={filteredToilets}
            selectedToiletId={selectedToilet?.id}
            onSelectToilet={(t) => setSelectedToilet(t)}
            userLocation={userLocation}
            height="100%"
          />

          {/* Quick Counter Overlay Pill */}
          <div className="absolute top-2.5 left-2.5 z-20 bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{filteredToilets.length} Facilities</span>
          </div>

          {/* Floating Selected Toilet Bottom Sheet Card */}
          {selectedToilet && (
            <div className="absolute bottom-16 left-2 right-2 sm:left-auto sm:right-3 sm:bottom-4 sm:w-92 z-30 bg-white rounded-3xl p-3.5 sm:p-4 shadow-2xl border border-slate-200 animate-slide-up space-y-2.5">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded">
                      {selectedToilet.facilityCode}
                    </span>
                    <StatusBadge status={selectedToilet.currentStatus} size="sm" />
                    <span className="text-[10px] font-bold text-slate-700">
                      {selectedToilet.distanceKm} km away
                    </span>
                  </div>
                  <h3 className="font-black text-sm text-slate-900 mt-1 leading-snug">
                    {selectedToilet.name}
                  </h3>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{selectedToilet.address}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleFavorite(selectedToilet.id)}
                    className={`p-1.5 rounded-full transition-colors ${
                      isFavorite(selectedToilet.id)
                        ? 'text-rose-500 bg-rose-50'
                        : 'text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isFavorite(selectedToilet.id) ? 'fill-rose-500' : ''
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => setSelectedToilet(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Feature Badges */}
              <div className="flex flex-wrap gap-1 text-[9px] font-semibold text-slate-700">
                <span className="px-1.5 py-0.5 bg-slate-100 rounded">
                  {selectedToilet.entryFee === 0 ? 'FREE' : `₹${selectedToilet.entryFee}`}
                </span>
                <span className="px-1.5 py-0.5 bg-slate-100 rounded">
                  🕒 {selectedToilet.openingHours.is24x7 ? '24/7' : `${selectedToilet.openingHours.open}-${selectedToilet.openingHours.close}`}
                </span>
                {selectedToilet.sanitaryFacilities?.some(
                  (sf) => sf.facilityType === 'pad_dispenser' && sf.availability
                ) && (
                  <span className="px-1.5 py-0.5 bg-pink-50 text-pink-700 rounded border border-pink-200">
                    ✨ Pads
                  </span>
                )}
                {selectedToilet.facilities.wheelchairRamp && (
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                    ♿ Ramp
                  </span>
                )}
                {selectedToilet.facilities.hasRunningWater && (
                  <span className="px-1.5 py-0.5 bg-cyan-50 text-cyan-800 rounded">
                    💧 Water OK
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedToilet.latitude},${selectedToilet.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-colors shadow-xs"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Navigate</span>
                </a>

                <Link
                  to={`/toilets/${selectedToilet.id}`}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-colors"
                >
                  <span>Details</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>

                <Link
                  to={`/report?toiletId=${selectedToilet.id}`}
                  className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-colors"
                >
                  <AlertOctagon className="w-3 h-3" />
                  <span>Report</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* List Mode View */
        <div className="flex-1 overflow-y-auto max-w-3xl mx-auto w-full px-3 py-3 space-y-2.5 pb-24">
          <div className="text-xs font-bold text-slate-500 px-1">
            Found {filteredToilets.length} public facilities in Pune Pilot
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredToilets.map((toilet) => (
              <div
                key={toilet.id}
                onClick={() => {
                  setSelectedToilet(toilet);
                  setViewMode('map');
                }}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded">
                        {toilet.facilityCode}
                      </span>
                      <StatusBadge status={toilet.currentStatus} size="sm" />
                      <span className="text-[11px] font-bold text-slate-700">
                        {toilet.distanceKm} km
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 mt-1 line-clamp-1">
                      {toilet.name}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-1">{toilet.address}</p>
                  </div>

                  <span className="text-xs font-black text-slate-800 shrink-0">
                    {toilet.entryFee === 0 ? 'FREE' : `₹${toilet.entryFee}`}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 text-[10px] text-slate-600">
                  {toilet.sanitaryFacilities?.some(
                    (sf) => sf.facilityType === 'pad_dispenser' && sf.availability
                  ) && (
                    <span className="px-1.5 py-0.2 bg-pink-50 text-pink-700 rounded font-semibold border border-pink-200">
                      ✨ Pads
                    </span>
                  )}
                  {toilet.facilities.wheelchairRamp && (
                    <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200">
                      ♿ Accessible
                    </span>
                  )}
                  {toilet.facilities.hasRunningWater && (
                    <span className="px-1.5 py-0.2 bg-cyan-50 text-cyan-800 rounded font-semibold">
                      💧 Water
                    </span>
                  )}
                  <span className="px-1.5 py-0.2 bg-slate-100 rounded font-semibold">
                    ★ {toilet.rating}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${toilet.latitude},${toilet.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Navigate</span>
                  </a>

                  <Link
                    to={`/toilets/${toilet.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-bold text-slate-700 hover:text-slate-900 flex items-center gap-0.5"
                  >
                    <span>Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
