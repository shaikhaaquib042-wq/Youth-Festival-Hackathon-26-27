import React from 'react';
import { Link } from 'react-router-dom';
import { Toilet } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { useSanitrack } from '../../context/SanitrackContext';
import { calculateDistanceKm } from '../../lib/utils';
import {
  MapPin,
  Star,
  Sparkles,
  Droplets,
  Accessibility,
  Clock,
  Heart,
  Navigation,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

interface ToiletCardProps {
  toilet: Toilet;
  onSelect?: () => void;
  isSelected?: boolean;
}

export const ToiletCard: React.FC<ToiletCardProps> = ({
  toilet,
  onSelect,
  isSelected = false,
}) => {
  const { userLocation, toggleFavorite, isFavorite } = useSanitrack();
  const favorite = isFavorite(toilet.id);

  const distance = calculateDistanceKm(
    userLocation.lat,
    userLocation.lng,
    toilet.latitude,
    toilet.longitude
  );

  const padDispenser = toilet.sanitaryFacilities?.find(
    (sf) => sf.facilityType === 'pad_dispenser'
  );

  const hasWomenSection = toilet.sections.some((s) => s.sectionType === 'women');

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer relative group ${
        isSelected
          ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      {/* Top Header: Code, Freshness & Favorite */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
            {toilet.facilityCode}
          </span>
          <StatusBadge status={toilet.currentStatus} size="sm" />
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {toilet.statusFreshness}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(toilet.id);
          }}
          className={`p-1.5 rounded-full transition-colors ${
            favorite
              ? 'text-rose-500 bg-rose-50'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
          title={favorite ? 'Remove from favorites' : 'Save to favorites'}
        >
          <Heart className={`w-4 h-4 ${favorite ? 'fill-rose-500' : ''}`} />
        </button>
      </div>

      {/* Title & Locality */}
      <div className="mb-2">
        <Link
          to={`/toilets/${toilet.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1"
        >
          {toilet.name}
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{toilet.address}</span>
          <span className="shrink-0 font-semibold text-slate-700">· {distance} km away</span>
        </div>
      </div>

      {/* Rating & Fee */}
      <div className="flex items-center gap-3 text-xs mb-3">
        <div className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
          <span>{toilet.rating}</span>
          <span className="text-slate-400 font-normal">({toilet.reviewCount})</span>
        </div>

        <span className="text-slate-600 font-medium">
          {toilet.entryFee === 0 ? (
            <span className="text-emerald-700 font-bold">Free Facility</span>
          ) : (
            `Entry: ₹${toilet.entryFee}`
          )}
        </span>

        <span className="text-slate-400">|</span>

        <span className="text-slate-600">
          {toilet.openingHours.is24x7 ? (
            <span className="font-semibold text-indigo-700">Open 24/7</span>
          ) : (
            `${toilet.openingHours.open} - ${toilet.openingHours.close}`
          )}
        </span>
      </div>

      {/* Facilities Badges Row */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {hasWomenSection && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md border border-purple-200">
            <span>👩</span> Women’s Section
          </span>
        )}

        {padDispenser && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
              padDispenser.currentStock === 'available'
                ? 'bg-pink-50 text-pink-700 border-pink-200'
                : padDispenser.currentStock === 'low'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Pads: {padDispenser.currentStock.replace('_', ' ')}</span>
          </span>
        )}

        {toilet.facilities.wheelchairRamp && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
            <Accessibility className="w-3 h-3" />
            Ramp & Rails
          </span>
        )}

        {toilet.facilities.hasRunningWater ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 bg-cyan-50 text-cyan-800 rounded-md">
            <Droplets className="w-3 h-3 text-cyan-600" />
            Running Water
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md">
            <AlertCircle className="w-3 h-3" />
            No Water
          </span>
        )}

        {toilet.facilities.hasCaretaker && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
            <ShieldCheck className="w-3 h-3 text-slate-500" />
            Attendant
          </span>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${toilet.latitude},${toilet.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-600" />
          <span>Get Directions</span>
        </a>

        <div className="flex items-center gap-2">
          <Link
            to={`/report?toiletId=${toilet.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors"
          >
            Report Issue
          </Link>
          <Link
            to={`/toilets/${toilet.id}`}
            onClick={(e) => e.stopPropagation()}
            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg transition-colors border border-emerald-200"
          >
            Details &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
