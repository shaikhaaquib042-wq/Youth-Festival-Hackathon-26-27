import React from 'react';
import { Accessibility, Eye, CheckCircle2, Shield } from 'lucide-react';

export const AccessibilityPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Accessibility Statement</h1>
        <p className="text-xs text-slate-500">WCAG 2.2 AA Conformance Target · SaniTrack Inclusivity</p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Accessibility className="w-4 h-4 text-blue-600" />
            <span>1. Physical & Digital Accessibility Alignment</span>
          </h2>
          <p>
            Public sanitation is a fundamental civil right. SaniTrack catalogues wheelchair entrance gradients, grab bar positions, lowered handwash basins, and wide door clearances so that persons with reduced mobility and senior citizens can locate verified accessible facilities without uncertainty.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-600" />
            <span>2. Digital Standards & Contrast</span>
          </h2>
          <p>
            The SaniTrack application is designed according to Web Content Accessibility Guidelines (WCAG 2.2 Level AA). We ensure high-contrast color ratios, visible focus indicators, descriptive ARIA attributes, semantic HTML tags, and full keyboard navigation across all interactive maps and forms.
          </p>
        </section>
      </div>
    </div>
  );
};
