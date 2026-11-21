import React from 'react';
import { Link } from 'react-router-dom';
import { Award, ShieldCheck, HeartHandshake, CheckCircle2, MapPin, Compass } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
          <Award className="w-3.5 h-3.5" />
          <span>Naya Bharat 2047 · Problem Statement 3.2</span>
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          About SaniTrack
        </h1>
        <p className="text-base text-slate-600 font-medium">
          Smart Public Sanitation Network — <strong>Find. Verify. Report. Improve.</strong>
        </p>
      </div>

      <div className="prose prose-slate max-w-none space-y-6 text-sm text-slate-700 leading-relaxed">
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-lg font-bold text-slate-900">1. The Problem We Address</h2>
          <p>
            Citizens in urban India frequently struggle with a simple, urgent question: <em>"Is there a usable toilet nearby?"</em> Many navigation apps show generic pins on a map, but cannot tell whether the door is locked, whether running water is available, if soap and menstrual hygiene products exist, or if the approach is safe and well-lit at night.
          </p>
          <p>
            Furthermore, maintenance breakdowns take weeks to resolve due to fragmented communication between citizens, field caretakers, and municipal ward officers.
          </p>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-lg font-bold text-slate-900">2. The SaniTrack Solution</h2>
          <p>
            SaniTrack connects all sanitation stakeholders into a shared, transparent accountability loop:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li><strong>Discover:</strong> Geospatial discovery with filters for women's hygiene, wheelchair accessibility, and running water.</li>
            <li><strong>Verify:</strong> Live freshness timestamps showing who audited the status (Caretaker, Official, or Citizen) and when.</li>
            <li><strong>Report:</strong> Fast citizen grievance filing with public reference codes and strict municipal SLA countdowns.</li>
            <li><strong>Improve:</strong> Transparent Rotary & community funding to repair facilities when municipal budgets face delays.</li>
          </ul>
        </div>

        <div className="p-6 bg-emerald-50/70 rounded-3xl border border-emerald-200 space-y-3">
          <h2 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>3. Prototype Integrity Principle</span>
          </h2>
          <p className="text-xs text-emerald-900 leading-relaxed">
            All data currently displayed is part of our hackathon pilot demonstration for Pune. SaniTrack strictly avoids claiming that a facility is safe, live, or official without verifiable timestamps. We clearly distinguish between sample data, citizen reports, operator updates, and official municipal audits.
          </p>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-lg font-bold text-slate-900">4. Alignment with Naya Bharat 2047</h2>
          <p>
            Aligned with the national vision for 2047, SaniTrack advances urban dignity, women's menstrual health, universal accessibility, and citizen-led digital governance under Swachh Bharat Mission 2.0.
          </p>
        </div>
      </div>
    </div>
  );
};
