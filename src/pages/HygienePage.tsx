import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSanitrack } from '../context/SanitrackContext';
import { useAuth } from '../context/AuthContext';
import { calculateDistanceKm, formatTimeAgo } from '../lib/utils';
import {
  Sparkles,
  MapPin,
  Clock,
  HeartHandshake,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Navigation,
  Share2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const HygienePage: React.FC = () => {
  const { toilets, userLocation, updatePadStock } = useSanitrack();
  const { currentUser } = useAuth();
  const [stockFilter, setStockFilter] = useState<'all' | 'available' | 'low_out'>('all');
  const [refillFeedback, setRefillFeedback] = useState<string | null>(null);

  // Filter toilets with sanitary facilities
  const hygieneToilets = toilets
    .filter((toilet) => {
      const padDispenser = toilet.sanitaryFacilities?.find(
        (sf) => sf.facilityType === 'pad_dispenser'
      );
      if (!padDispenser) return false;

      if (stockFilter === 'available' && padDispenser.currentStock !== 'available') {
        return false;
      }
      if (
        stockFilter === 'low_out' &&
        padDispenser.currentStock === 'available'
      ) {
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
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const handleRequestRefill = (toiletId: string, toiletName: string) => {
    // In our prototype, requesting a refill notifies the operator and logs a task
    setRefillFeedback(`Refill request lodged for "${toiletName}". Operator task dispatched.`);
    setTimeout(() => setRefillFeedback(null), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24 md:pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-pink-900 via-rose-950 to-slate-950 text-white rounded-3xl p-4 sm:p-7 border border-pink-800/40 shadow-sm space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold border border-pink-400/30">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>Menstrual Dignity & Rotary WASH Network</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
          Sanitary Pad Dispenser & Hygiene Facility Finder
        </h1>

        <p className="max-w-3xl text-xs sm:text-sm text-pink-100 leading-relaxed">
          Locate public restrooms in Pune with active menstrual hygiene vending machines, certified disposable bins, safe incinerators, and private changing spaces.
        </p>

        {/* Rotary Partnership Credit */}
        <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-pink-200">
          <span className="flex items-center gap-1.5 font-bold">
            <HeartHandshake className="w-4 h-4 text-pink-400" />
            Supported by Rotary Club of Pune Midtown
          </span>
          <span className="text-pink-400">·</span>
          <span>Dual Coin & QR Code Enabled</span>
          <span className="text-pink-400">·</span>
          <span>100% Biodegradable Napkins</span>
        </div>
      </div>

      {/* Refill Feedback Alert */}
      {refillFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center justify-between">
          <span>✅ {refillFeedback}</span>
          <span className="text-emerald-600 font-normal text-[11px]">SLA: 2 hours</span>
        </div>
      )}

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Stock Status:</span>
          <button
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              stockFilter === 'all'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Dispensers ({hygieneToilets.length})
          </button>
          <button
            onClick={() => setStockFilter('available')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              stockFilter === 'available'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            In Stock Only
          </button>
          <button
            onClick={() => setStockFilter('low_out')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              stockFilter === 'low_out'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Low / Empty (Needs Refill)
          </button>
        </div>

        <Link
          to="/campaigns"
          className="text-xs font-bold text-pink-700 hover:text-pink-800 flex items-center gap-1"
        >
          <span>Sponsor Pad Dispensers via Rotary</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hygieneToilets.map((toilet) => {
          const dispenser = toilet.sanitaryFacilities?.find(
            (sf) => sf.facilityType === 'pad_dispenser'
          );
          const hasIncinerator = toilet.sanitaryFacilities?.some(
            (sf) => sf.facilityType === 'incinerator'
          );
          const hasBin = toilet.sanitaryFacilities?.some(
            (sf) => sf.facilityType === 'sanitary_bin'
          );

          return (
            <div
              key={toilet.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-pink-300 hover:shadow-md transition-all space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                      {toilet.facilityCode}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        dispenser?.currentStock === 'available'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : dispenser?.currentStock === 'low'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {dispenser?.currentStock.toUpperCase()} STOCK
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                    {toilet.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{toilet.locality}</span>
                    <span className="font-semibold text-slate-700">· {toilet.distanceKm} km away</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-slate-900">
                    ₹{dispenser?.pricePerPad || 5}
                  </div>
                  <div className="text-[10px] text-slate-500">per napkin</div>
                </div>
              </div>

              {/* Stock Details & Refill Freshness */}
              <div className="p-3 bg-pink-50/50 rounded-2xl border border-pink-100 space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span>Last Restocked:</span>
                  <strong className="text-slate-900">
                    {dispenser?.lastRefilledAt
                      ? formatTimeAgo(dispenser.lastRefilledAt)
                      : 'Unknown'}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Verification Source:</span>
                  <span className="text-slate-600 font-medium">
                    {dispenser?.verificationSource || 'Operator Audit'}
                  </span>
                </div>
                {dispenser?.sponsorName && (
                  <div className="flex items-center justify-between text-purple-700 font-semibold">
                    <span>Sponsor Partner:</span>
                    <span>{dispenser.sponsorName}</span>
                  </div>
                )}
              </div>

              {/* Sanitation Waste Disposal Features */}
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                {hasBin && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Lidded Sanitary Bins
                  </span>
                )}
                {hasIncinerator && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    Disposal Incinerator
                  </span>
                )}
                {toilet.facilities.soapAvailable && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 font-medium">
                    Liquid Soap Available
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${toilet.latitude},${toilet.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-pink-700 hover:text-pink-800 flex items-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Get Directions</span>
                </a>

                <div className="flex items-center gap-2">
                  {dispenser?.currentStock !== 'available' && (
                    <button
                      onClick={() => handleRequestRefill(toilet.id, toilet.name)}
                      className="px-3 py-1.5 rounded-xl bg-pink-100 hover:bg-pink-200 text-pink-800 text-xs font-bold transition-colors flex items-center gap-1"
                      title="Alert operator to refill stock"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Request Refill</span>
                    </button>
                  )}
                  <Link
                    to={`/toilets/${toilet.id}`}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
                  >
                    View Details &rarr;
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
