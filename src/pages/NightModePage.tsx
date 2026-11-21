import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSanitrack } from '../context/SanitrackContext';
import { calculateDistanceKm } from '../lib/utils';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Moon,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  PhoneCall,
  Share2,
  MapPin,
  ExternalLink,
  ChevronRight,
  Info,
  Navigation,
} from 'lucide-react';

export const NightModePage: React.FC = () => {
  const { toilets, userLocation } = useSanitrack();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<'current' | '10pm' | 'midnight' | '2am'>('current');
  const [onlyVerifiedAttendant, setOnlyVerifiedAttendant] = useState(false);

  // Night recommendation ranking algorithm
  const nightToilets = toilets
    .filter((toilet) => {
      // Must have women or accessible section
      const hasSafeSection = toilet.sections.some(
        (s) => s.sectionType === 'women' || s.sectionType === 'accessible'
      );
      if (!hasSafeSection) return false;

      // Filter by open hours
      if (selectedTimeSlot === 'midnight' || selectedTimeSlot === '2am') {
        if (!toilet.openingHours.is24x7) return false;
      }

      if (onlyVerifiedAttendant && !toilet.facilities.hasCaretaker) {
        return false;
      }

      return true;
    })
    .map((toilet) => {
      const distance = calculateDistanceKm(
        userLocation.lat,
        userLocation.lng,
        toilet.latitude,
        toilet.longitude
      );

      // Score 0-100 based on objective criteria
      let score = 50;
      if (toilet.currentStatus === 'open') score += 20;
      if (toilet.openingHours.is24x7) score += 10;
      if (toilet.facilities.hasCaretaker) score += 10;
      if (toilet.facilities.wellLitApproach) score += 5;
      if (toilet.facilities.cctvOutsideApproach) score += 5;

      return {
        ...toilet,
        distanceKm: distance,
        computedScore: score,
      };
    })
    .sort((a, b) => b.computedScore - a.computedScore);

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24 md:pb-12">
      {/* Night Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-4 sm:p-7 border border-indigo-900/40 shadow-sm space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30">
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
          <span>Transparent Night Recommendation Mode</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
          Nighttime Women’s & Commuter Facility Finder
        </h1>

        <p className="max-w-3xl text-xs sm:text-sm text-slate-300 leading-relaxed">
          Recommends public facilities based on verifiable objective criteria: confirmed night operating hours, inspected exterior lighting, active attendants, and audited pedestrian approaches.
        </p>

        {/* Responsible Civic Notice */}
        <div className="p-3.5 bg-indigo-950/80 rounded-2xl border border-indigo-800/50 flex items-start gap-3 text-xs text-indigo-200">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px] sm:text-xs">
            <strong>Important Safety Notice:</strong> SaniTrack provides algorithmic recommendations based on verified municipal and operator logs; it <strong>never</strong> guarantees personal safety. Always trust your surroundings and use the quick SOS shortcuts below if needed.
          </p>
        </div>

        {/* SOS Action Strip */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a
            href="tel:1091"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call 1091 (Women Helpline)</span>
          </a>

          <a
            href="tel:112"
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call 112 (National Emergency)</span>
          </a>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'My Night Route via SaniTrack',
                  text: 'Sharing my live public toilet route in Pune via SaniTrack:',
                  url: window.location.href,
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Night navigation link copied to clipboard!');
              }
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-2 transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Route with Trusted Contact</span>
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 mr-2">Target Time:</span>
          {[
            { id: 'current', label: 'Current Time (Now)' },
            { id: '10pm', label: 'Late Evening (10:00 PM)' },
            { id: 'midnight', label: 'Midnight (24/7 Units Only)' },
            { id: '2am', label: 'Late Night (02:00 AM)' },
          ].map((slot) => (
            <button
              key={slot.id}
              onClick={() => setSelectedTimeSlot(slot.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedTimeSlot === slot.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {slot.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyVerifiedAttendant}
            onChange={(e) => setOnlyVerifiedAttendant(e.target.checked)}
            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
          />
          <span>Only facilities with on-duty staff / caretaker</span>
        </label>
      </div>

      {/* Recommended Facilities Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="font-bold text-slate-800">
            {nightToilets.length} Recommended Facilities Ranked by Night Audit Score
          </span>
          <span>Pune Municipal Pilot Area</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {nightToilets.map((toilet) => (
            <div
              key={toilet.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all space-y-4 relative"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                      {toilet.facilityCode}
                    </span>
                    <StatusBadge status={toilet.currentStatus} size="sm" />
                    <span className="text-[11px] text-slate-500 font-medium">
                      🕒 {toilet.statusFreshness}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                    {toilet.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{toilet.locality}</span>
                    <span className="font-semibold text-indigo-700">· {toilet.distanceKm} km away</span>
                  </div>
                </div>

                {/* Night Score Badge */}
                <div className="text-center p-2 rounded-2xl bg-indigo-50 border border-indigo-100 shrink-0">
                  <div className="text-base font-black text-indigo-800">
                    {toilet.computedScore}
                  </div>
                  <div className="text-[9px] font-bold text-indigo-600 uppercase tracking-wide">
                    Night Score
                  </div>
                </div>
              </div>

              {/* Transparent "Why Recommended" Reasons Checklist */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                  Verifiable Night Audit Factors:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    {toilet.openingHours.is24x7 ? (
                      <span className="text-emerald-600 font-bold">✓ 24/7 Verified Access</span>
                    ) : (
                      <span className="text-slate-600">✓ Open till {toilet.openingHours.close}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {toilet.facilities.hasCaretaker ? (
                      <span className="text-emerald-600 font-bold">✓ Attendant On Duty</span>
                    ) : (
                      <span className="text-slate-400">✗ Unattended facility</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {toilet.facilities.wellLitApproach ? (
                      <span className="text-emerald-600 font-bold">✓ Audited Perimeter Lighting</span>
                    ) : (
                      <span className="text-amber-600 font-medium">⚠️ Low Approach Lighting</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {toilet.facilities.cctvOutsideApproach ? (
                      <span className="text-emerald-600 font-bold">✓ Street CCTV Covered</span>
                    ) : (
                      <span className="text-slate-400">✗ No CCTV recorded</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${toilet.latitude},${toilet.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Navigate Now ({toilet.distanceKm} km)</span>
                </a>

                <Link
                  to={`/toilets/${toilet.id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <span>Facility Profile</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
