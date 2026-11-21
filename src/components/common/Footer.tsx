import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, HeartHandshake, ExternalLink, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 text-sm mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Mission */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-black text-sm">
                ST
              </div>
              <span className="font-extrabold text-lg text-white tracking-tight">SaniTrack</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Find. Verify. Report. Improve. A citizen-driven public sanitation network connecting citizens, operators, municipal ward officers, and community funding partners.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-emerald-400 text-xs font-medium">
              <MapPin className="w-3.5 h-3.5" />
              <span>Pilot Area: Pune Municipal Corp.</span>
            </div>
          </div>

          {/* Col 2: Citizen Discovery */}
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-3">
              Citizen Discovery
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/find" className="hover:text-emerald-400 transition-colors">
                  Find Nearby Toilets (Map & List)
                </Link>
              </li>
              <li>
                <Link to="/night-mode" className="hover:text-emerald-400 transition-colors">
                  Nighttime Women’s Recommendation
                </Link>
              </li>
              <li>
                <Link to="/hygiene" className="hover:text-emerald-400 transition-colors">
                  Sanitary Pad Dispenser Finder
                </Link>
              </li>
              <li>
                <Link to="/report" className="hover:text-emerald-400 transition-colors">
                  Report a Sanitation Issue
                </Link>
              </li>
              <li>
                <Link to="/track" className="hover:text-emerald-400 transition-colors">
                  Track Complaint by Reference Code
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Stakeholders & Transparency */}
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-3">
              Rotary & Transparency
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/campaigns" className="hover:text-emerald-400 transition-colors">
                  Approved Community Campaigns
                </Link>
              </li>
              <li>
                <Link to="/dashboard/rotary" className="hover:text-emerald-400 transition-colors">
                  Rotary Partner Funding Desk
                </Link>
              </li>
              <li>
                <Link to="/dashboard/municipal" className="hover:text-emerald-400 transition-colors">
                  Municipal Ward Officers Desk
                </Link>
              </li>
              <li>
                <Link to="/dashboard/operator" className="hover:text-emerald-400 transition-colors">
                  Sanitation Worker & Operator Portal
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-emerald-400 transition-colors">
                  Methodology & Verification Rules
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Prototype Disclaimer */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Prototype Transparency</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Developed for <strong>Naya Bharat 2047: Problem Statement 3.2</strong>. Displays sample and operator demonstration data. No claim of official endorsement is made without formal MoU.
            </p>
            <div className="pt-1 text-[11px] text-slate-500">
              © 2024 SaniTrack Urban Sanitation. Built with Supabase & React.
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div>Aligned with Swachh Bharat Mission (Urban 2.0) & SDGs 6, 5, 11</div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-slate-400">Privacy Policy</Link>
            <Link to="/accessibility" className="hover:text-slate-400">Accessibility Statement</Link>
            <Link to="/about" className="hover:text-slate-400">About SaniTrack</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
