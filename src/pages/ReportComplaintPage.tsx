import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useSanitrack } from '../context/SanitrackContext';
import { PriorityLevel } from '../types';
import {
  AlertOctagon,
  Camera,
  MapPin,
  CheckCircle2,
  Mail,
  ArrowRight,
  X,
  FileText,
} from 'lucide-react';

const CATEGORIES = [
  'Dirty/unhygienic toilet',
  'No running water',
  'Broken flush/tap/pipe',
  'Broken door lock/latch',
  'Locked or unexpectedly closed',
  'Sanitary pad dispenser empty or broken',
  'Missing sanitary waste bin/disposal',
  'No electricity or dark approach',
  'Blocked drainage / water pooling',
  'Accessibility ramp/rail broken',
  'Other maintenance issue',
];

export const ReportComplaintPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toilets, submitComplaint } = useSanitrack();

  const preselectedToiletId = searchParams.get('toiletId') || '';

  const [selectedToiletId, setSelectedToiletId] = useState(preselectedToiletId);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !reporterEmail.trim()) return;

    const toilet = toilets.find((t) => t.id === selectedToiletId);
    const toiletName = toilet ? toilet.name : 'Pune Public Facility';

    const ref = submitComplaint({
      toiletId: selectedToiletId || toilets[0]?.id || 'toilet-fc-road-she',
      toiletName,
      category,
      description,
      priority,
      reporterEmail: reporterEmail.trim(),
      isAnonymous: false,
      photoDataUrl: photoPreview || undefined,
    });

    setSubmittedRef(ref);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-28">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <AlertOctagon className="w-6 h-6 text-rose-600 shrink-0" />
          <span>Report a Sanitation Issue</span>
        </h1>
        <p className="text-xs text-slate-500">
          No account needed. Just your email to receive tracking and repair updates.
        </p>
      </div>

      {submittedRef ? (
        /* Submission Success Screen */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-sm text-center space-y-5 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900">
              Report Successfully Logged!
            </h2>
            <p className="text-xs text-slate-500">
              We've registered your grievance and queued it for the municipal ward team.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-w-sm mx-auto">
            <div className="text-[10px] text-slate-400 font-bold uppercase">
              Your Tracking Reference Code
            </div>
            <div className="text-2xl font-mono font-black text-emerald-700 mt-1 select-all">
              {submittedRef}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Updates will be sent to: <strong>{reporterEmail}</strong>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <Link
              to={`/track/${submittedRef}`}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2"
            >
              <span>Track Live Status</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/reports"
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Public Reports Hub</span>
            </Link>

            <button
              onClick={() => {
                setSubmittedRef(null);
                setDescription('');
                setPhotoPreview(null);
              }}
              className="w-full sm:w-auto px-4 py-2.5 text-slate-500 text-xs font-semibold hover:text-slate-800"
            >
              Report Another
            </button>
          </div>
        </div>
      ) : (
        /* Form */
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-4"
        >
          {/* Facility Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Select Public Facility in Pune *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={selectedToiletId}
                onChange={(e) => setSelectedToiletId(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
              >
                <option value="">-- Choose Facility --</option>
                {toilets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.locality})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Issue Category Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Issue Category *
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    category === cat
                      ? 'bg-rose-50 text-rose-800 border-rose-400 ring-1 ring-rose-400'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Description */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Describe the Issue *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Tap in second cubicle is leaking, door latch is broken, no water in flush..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs placeholder-slate-400 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>

          {/* Email Address Input (Only Email Required) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Your Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                placeholder="e.g. yourname@gmail.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              No password needed. We only use this to send you the tracking link and photo proof when repaired.
            </p>
          </div>

          {/* Photo Upload (Optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Attach Photo Evidence (Optional)
            </label>

            {photoPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-w-xs">
                <img src={photoPreview} alt="Preview" className="w-full h-36 object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="absolute top-2 right-2 p-1 bg-black/70 text-white rounded-full hover:bg-black"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-4 border border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-emerald-50/20 transition-colors">
                <Camera className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">
                  Tap to add a photo of the fixture/cleanliness
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 mt-2"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Submit Grievance</span>
          </button>
        </form>
      )}
    </div>
  );
};
