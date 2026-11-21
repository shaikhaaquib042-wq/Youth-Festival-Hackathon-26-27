import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Compass,
  Sparkles,
  AlertOctagon,
  HeartHandshake,
  PhoneCall,
  FileText,
  Share2,
  X,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-13 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-base tracking-tighter">ST</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                SaniTrack
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded uppercase">
                Pune
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-xl transition-all ${
                location.pathname === '/' || location.pathname === '/find'
                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Toilets Map
            </Link>
            <Link
              to="/reports"
              className={`px-3 py-1.5 rounded-xl transition-all ${
                location.pathname === '/reports'
                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Public Reports
            </Link>
            <Link
              to="/hygiene"
              className={`px-3 py-1.5 rounded-xl transition-all ${
                location.pathname === '/hygiene'
                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Pads & Hygiene
            </Link>
            <Link
              to="/night-mode"
              className={`px-3 py-1.5 rounded-xl transition-all ${
                location.pathname === '/night-mode'
                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Night Safe
            </Link>
            <Link
              to="/campaigns"
              className={`px-3 py-1.5 rounded-xl transition-all ${
                location.pathname === '/campaigns'
                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Community Fund
            </Link>
          </nav>

          {/* Right Header: SOS Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEmergencyModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-1.5 transition-colors shrink-0"
              title="Emergency SOS"
            >
              <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
              <span>SOS Help</span>
            </button>
          </div>
        </div>
      </header>

      {/* Emergency Modal */}
      {emergencyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <PhoneCall className="w-5 h-5" />
                <span>Emergency Helplines (Pune)</span>
              </div>
              <button
                onClick={() => setEmergencyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <a
                href="tel:112"
                className="flex items-center justify-between p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
              >
                <div>
                  <div className="font-bold text-rose-900 text-sm">112 - National Emergency</div>
                  <div className="text-rose-700 text-[11px]">Police, Fire & Ambulance Dispatch</div>
                </div>
                <span className="font-bold px-3 py-1 bg-rose-600 text-white rounded-lg">Call</span>
              </a>

              <a
                href="tel:1091"
                className="flex items-center justify-between p-3 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors"
              >
                <div>
                  <div className="font-bold text-purple-900 text-sm">1091 - Women Safety Helpline</div>
                  <div className="text-purple-700 text-[11px]">Maharashtra Women Safety Cell 24/7</div>
                </div>
                <span className="font-bold px-3 py-1 bg-purple-600 text-white rounded-lg">Call</span>
              </a>

              <a
                href="tel:18001030222"
                className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                <div>
                  <div className="font-bold text-emerald-900 text-sm">1800 103 0222 - PMC Helpline</div>
                  <div className="text-emerald-700 text-[11px]">Municipal Sanitation & Caretaker Desk</div>
                </div>
                <span className="font-bold px-3 py-1 bg-emerald-600 text-white rounded-lg">Call</span>
              </a>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'My Location via SaniTrack Pune',
                      text: 'I am at a public facility in Pune. Check my location on SaniTrack:',
                      url: window.location.href,
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Location link copied to clipboard!');
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 className="w-4 h-4 text-slate-600" />
                <span>Share Location with Trusted Contact</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
