import React from 'react';
import { ShieldCheck, Lock, EyeOff, UserCheck } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Privacy Policy</h1>
        <p className="text-xs text-slate-500">Last updated: November 2024 · SaniTrack Civic Architecture</p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-emerald-600" />
            <span>1. Reporter Anonymity & Public Redaction</span>
          </h2>
          <p>
            When submitting a sanitation grievance, citizens may choose to submit anonymously. Public-facing grievance tracking pages display only sanitized summaries and reference codes. No telephone numbers, email addresses, or private home locations are exposed to third parties.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>2. Photo Evidence & No-Face Policy</span>
          </h2>
          <p>
            Photographs uploaded as evidence of toilet cleanliness or mechanical breakdown must only depict physical fixtures (leaking pipes, empty soap dispensers, broken locks). Users are strictly prompted not to upload images containing human faces or private identity documents.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>3. Row Level Security & Access Control</span>
          </h2>
          <p>
            SaniTrack enforces Supabase Row Level Security (RLS) across all database tables. Public visitors have read-only access to vetted facility directories and public transparency ledgers. Administrative operations require cryptographically verified role credentials.
          </p>
        </section>
      </div>
    </div>
  );
};
