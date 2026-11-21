import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSanitrack } from '../context/SanitrackContext';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { calculateDistanceKm, formatTimeAgo } from '../lib/utils';
import {
  MapPin,
  Clock,
  Star,
  Sparkles,
  Droplets,
  Accessibility,
  ShieldCheck,
  AlertOctagon,
  Navigation,
  Heart,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Wrench,
  Camera,
  MessageSquare,
  ArrowLeft,
  Calendar,
  Share2,
} from 'lucide-react';

export const ToiletDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    toilets,
    reviews,
    submitReview,
    toggleFavorite,
    isFavorite,
    userLocation,
    updateToiletStatus,
  } = useSanitrack();
  const { currentRole } = useAuth();

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [newCleanliness, setNewCleanliness] = useState(5);
  const [newOdor, setNewOdor] = useState(4);
  const [newWater, setNewWater] = useState(5);

  const toilet = toilets.find((t) => t.id === id);

  if (!toilet) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Facility Not Found</h2>
        <p className="text-sm text-slate-500">
          The requested toilet facility could not be found or has been retired.
        </p>
        <Link
          to="/find"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Toilet Discovery</span>
        </Link>
      </div>
    );
  }

  const favorite = isFavorite(toilet.id);
  const toiletReviews = reviews.filter((r) => r.toiletId === toilet.id);
  const distance = calculateDistanceKm(
    userLocation.lat,
    userLocation.lng,
    toilet.latitude,
    toilet.longitude
  );

  const padFacility = toilet.sanitaryFacilities?.find(
    (sf) => sf.facilityType === 'pad_dispenser'
  );

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    submitReview({
      toiletId: toilet.id,
      userName: 'Civic Contributor',
      rating: newRating,
      cleanlinessRating: newCleanliness,
      waterRating: newWater,
      odorRating: newOdor,
      comment: newComment,
      isVerifiedVisit: true,
    });

    setReviewModalOpen(false);
    setNewComment('');
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24 md:pb-12">
      {/* Top Breadcrumb & Nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to List</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: toilet.name,
                  text: `Check out ${toilet.name} on SaniTrack Pune:`,
                  url: window.location.href,
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Facility link copied to clipboard!');
              }
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Share Facility"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => toggleFavorite(toilet.id)}
            className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-bold ${
              favorite
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Heart className={`w-4 h-4 ${favorite ? 'fill-rose-500' : ''}`} />
            <span>{favorite ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                {toilet.facilityCode}
              </span>
              <StatusBadge status={toilet.currentStatus} size="md" />
              <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                Source: {toilet.verificationStatus.replace('_', ' ')}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {toilet.name}
            </h1>

            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toilet.address}</span>
              <span className="font-bold text-slate-800">· {distance} km from you</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${toilet.latitude},${toilet.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Navigation className="w-4 h-4" />
              <span>Get Directions</span>
            </a>

            <Link
              to={`/report?toiletId=${toilet.id}`}
              className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-2 transition-colors"
            >
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              <span>Report Grievance</span>
            </Link>
          </div>
        </div>

        {/* Freshness Banner */}
        <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-emerald-900 gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Status Freshness:</strong> {toilet.statusFreshness}
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">
            Verified by: {toilet.operatorName || 'PMC Solid Waste & Health Dept'}
          </span>
        </div>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100 text-center">
          <div className="p-3 bg-slate-50 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Rating</div>
            <div className="text-lg font-black text-amber-600 flex items-center justify-center gap-1 mt-0.5">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span>{toilet.rating} / 5</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              {toilet.reviewCount} verified reviews
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Entry Fee</div>
            <div className="text-lg font-black text-slate-800 mt-0.5">
              {toilet.entryFee === 0 ? 'FREE' : `₹${toilet.entryFee}`}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Public Civic Facility</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Operating Hours</div>
            <div className="text-lg font-black text-slate-800 mt-0.5">
              {toilet.openingHours.is24x7 ? '24 Hours' : toilet.openingHours.open}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              {toilet.openingHours.is24x7 ? 'Always Open' : `Closes at ${toilet.openingHours.close}`}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Night Safety Score</div>
            <div className="text-lg font-black text-indigo-700 mt-0.5">
              {toilet.nightRatingScore || 80} / 100
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Transparent Audit Matrix</div>
          </div>
        </div>
      </div>

      {/* Grid: Sections, Facilities & Menstrual Hygiene */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sections & Infrastructure */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Demarcated Gender Sections */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🚻</span>
              <span>Available Facility Sections</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {toilet.sections.map((sec) => (
                <div
                  key={sec.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 capitalize flex items-center gap-1.5">
                      {sec.sectionType === 'women' && '👩 Women’s Section'}
                      {sec.sectionType === 'men' && '👨 Men’s Section'}
                      {sec.sectionType === 'accessible' && '♿ Universal Accessible'}
                      {sec.sectionType === 'family' && '👨‍👩‍👧 Family & Diaper Section'}
                      {sec.sectionType === 'unisex' && '⚧ Unisex'}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Active
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <div>Cubicles: <strong>{sec.cubiclesCount}</strong></div>
                    {sec.urinalsCount > 0 && <div>Urinals: <strong>{sec.urinalsCount}</strong></div>}
                    <div className="text-[11px] text-slate-500">
                      Includes: {sec.hasWesternCommode ? 'Western Commode' : ''}
                      {sec.hasWesternCommode && sec.hasIndianToilet ? ' & ' : ''}
                      {sec.hasIndianToilet ? 'Indian Squat Plate' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Essential Water, Hygiene & Cleanliness */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-cyan-600" />
              <span>Hygiene & Utility Verification</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                {toilet.facilities.hasRunningWater ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">Running Water</div>
                  <div className="text-[10px] text-slate-500">
                    {toilet.facilities.hasRunningWater ? 'Confirmed Active' : 'Interrupted'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                {toilet.facilities.soapAvailable ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">Soap / Handwash</div>
                  <div className="text-[10px] text-slate-500">
                    {toilet.facilities.soapAvailable ? 'Stocked' : 'Missing'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                {toilet.facilities.hasAdequateLighting ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">Internal Lighting</div>
                  <div className="text-[10px] text-slate-500">Functional</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                {toilet.facilities.handwashBasin ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">Washbasin & Taps</div>
                  <div className="text-[10px] text-slate-500">Available</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                {toilet.facilities.hasMirror ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-400 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">Clean Mirror</div>
                  <div className="text-[10px] text-slate-500">Present</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                {toilet.facilities.hasExhaustFan ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-400 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">Ventilation Fan</div>
                  <div className="text-[10px] text-slate-500">Active</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Universal Accessibility */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Accessibility className="w-5 h-5 text-blue-600" />
              <span>Universal Accessibility Features</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="font-bold text-slate-800">Ramp Entrance</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {toilet.facilities.wheelchairRamp ? '✅ Gentle Slope Ramp' : '❌ Steps Only'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="font-bold text-slate-800">Support Grab Bars</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {toilet.facilities.grabBars ? '✅ Installed on Walls' : '❌ Not Installed'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="font-bold text-slate-800">Wide Doorway (90cm+)</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {toilet.facilities.wideDoorway ? '✅ Wheelchair Compliant' : '❌ Standard Door'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="font-bold text-slate-800">Lowered Basin</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {toilet.facilities.accessibleBasin ? '✅ Child & Chair Height' : '❌ Standard Height'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Women's Hygiene & Night Safety */}
        <div className="space-y-6">
          {/* Menstrual Hygiene Hub */}
          <div className="bg-gradient-to-br from-pink-50/80 via-white to-purple-50/40 rounded-3xl p-6 border border-pink-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-pink-950 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-600" />
                <span>Menstrual Hygiene</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 uppercase tracking-wider">
                Rotary WASH
              </span>
            </div>

            {padFacility ? (
              <div className="space-y-3">
                <div className="p-4 bg-white rounded-2xl border border-pink-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800">
                      Sanitary Pad Dispenser
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        padFacility.currentStock === 'available'
                          ? 'bg-emerald-100 text-emerald-800'
                          : padFacility.currentStock === 'low'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {padFacility.currentStock.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <div>Price per Pad: <strong>₹{padFacility.pricePerPad || 5}</strong> (Coin/UPI)</div>
                    <div className="text-[11px] text-slate-500">
                      Last Refilled: <strong>{formatTimeAgo(padFacility.lastRefilledAt)}</strong>
                    </div>
                    {padFacility.sponsorName && (
                      <div className="text-[11px] text-purple-700 font-medium">
                        Sponsored by: {padFacility.sponsorName}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Lidded Sanitary Disposal Bins inside cubicles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Hygienic safe incinerator for menstrual waste</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Private curtained changing space</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white/70 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
                <p>No sanitary pad dispenser currently verified at this unit.</p>
                <Link
                  to={`/campaigns?nominate=${toilet.id}`}
                  className="text-pink-700 font-bold hover:underline block"
                >
                  Nominate this toilet for a Rotary Pad Dispenser sponsorship &rarr;
                </Link>
              </div>
            )}
          </div>

          {/* Observable Safety & Attendant */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>Observable Safety Context</span>
            </h3>

            <p className="text-xs text-slate-500">
              Objective, verifiable indicators. (SaniTrack does not certify any area as 100% safe).
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <span>On-duty Staff / Caretaker</span>
                <span className="font-bold text-slate-800">
                  {toilet.facilities.hasCaretaker ? '✅ Attendant Present' : '❌ Unattended'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <span>Pedestrian Approach Lighting</span>
                <span className="font-bold text-slate-800">
                  {toilet.facilities.wellLitApproach ? '✅ Streetlights Audited' : '⚠️ Dim Approach'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <span>CCTV at Perimeter / Entry</span>
                <span className="font-bold text-slate-800">
                  {toilet.facilities.cctvOutsideApproach ? '✅ CCTV Active' : '❌ None'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Citizen Reviews & Feedback Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              <span>Citizen Cleanliness Reviews ({toiletReviews.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Community feedback from verified visitors
            </p>
          </div>

          <button
            onClick={() => setReviewModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
          >
            + Write Review
          </button>
        </div>

        {toiletReviews.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No reviews submitted yet for this facility. Be the first citizen to leave feedback!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {toiletReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{rev.userName}</span>
                    {rev.isVerifiedVisit && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
                        Verified Visit
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{rev.rating}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>

                <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1">
                  <span>Cleanliness: {rev.cleanlinessRating}/5</span>
                  <span>Water: {rev.waterRating}/5</span>
                  <span>Odor: {rev.odorRating}/5</span>
                  <span className="ml-auto">{formatTimeAgo(rev.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Write Review Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Review: {toilet.name}
            </h3>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Overall Rating (1 to 5 Stars)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setNewRating(star)}
                      className="p-1 text-amber-500 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= newRating ? 'fill-amber-500' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="font-bold text-slate-700 ml-2">{newRating} Stars</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Floor Cleanliness</label>
                  <select
                    value={newCleanliness}
                    onChange={(e) => setNewCleanliness(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} Stars
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Water Pressure</label>
                  <select
                    value={newWater}
                    onChange={(e) => setNewWater(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} Stars
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Odor Control</label>
                  <select
                    value={newOdor}
                    onChange={(e) => setNewOdor(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} Stars
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Your Feedback (What was good? What could be improved?)
                </label>
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="e.g. Very clean western commode, pad dispenser was working smoothly..."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-sm"
                >
                  Submit Verified Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
