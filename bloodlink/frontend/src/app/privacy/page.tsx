"use client";

import React from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export default function PrivacyPolicyPage() {
  return (
    <div className="space-y-6 pb-12">
      <AppHeader
        title="Privacy & DPDP Act Compliance Policy"
        subtitle="Digital Personal Data Protection Act, 2023 • Regulatory Framework"
        backHref="/request"
        backLabel="Back to Request"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content (8 Cols on Desktop) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="card space-y-6 p-6 sm:p-8 bg-[var(--sf)] text-xs leading-relaxed text-[var(--ink)]">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ink)] mb-2">
                1. Intermediary Status & Legal Framework
              </h2>
              <p className="text-[var(--mu)] leading-relaxed">
                BloodLink Pune operates strictly as a digital voluntary coordination intermediary connecting accredited Pune hospitals and licensed blood centres with willing voluntary donors. BloodLink does not collect, test, store, process, or deliver blood or blood components. All transfusions and clinical fitness determinations are solely conducted on-site by registered medical officers under the Drugs and Cosmetics Act.
              </p>
            </div>

            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ink)] mb-2">
                2. Strict Purpose Limitation (Zero Commercialization)
              </h2>
              <p className="text-[var(--mu)] leading-relaxed">
                In strict adherence to Section 4 of the Digital Personal Data Protection (DPDP) Act 2023, personal data is processed solely for computing hyper-local distance-ranked matching waves. We never sell, rent, monetize, or transfer contact data to private advertisers, third-party brokers, or pharmaceutical marketers.
              </p>
            </div>

            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ink)] mb-2">
                3. Zero Public Directory Architecture (No Scraping)
              </h2>
              <p className="text-[var(--mu)] leading-relaxed">
                Unlike legacy blood donation sites that expose phone numbers publicly and cause midnight harassment, BloodLink never exposes donor phone numbers or names on public pages, search engines, or open tracking links. Communication is orchestrated via private, unguessable UUID capability tokens and automated notifications.
              </p>
            </div>

            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ink)] mb-2">
                4. Data Retention & Slip Purge Policy
              </h2>
              <ul className="list-disc pl-4 space-y-2 text-[var(--mu)]">
                <li>
                  <strong className="text-[var(--ink)]">Official Hospital Requisition Slips:</strong> Requisition photos stored in encrypted buckets are automatically purged 7 days after the requisition reaches FULFILLED or EXPIRED status.
                </li>
                <li>
                  <strong className="text-[var(--ink)]">Donor Registrations:</strong> Retained until the donor requests erasure. Donors can pause alerts or delete their profile instantly at any time from their private donor link.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ink)] mb-2">
                5. Right to Withdraw Consent & Erasure
              </h2>
              <p className="text-[var(--mu)] leading-relaxed">
                Under Section 6(4) of the DPDP Act 2023, data principals hold the absolute right to withdraw consent. Clicking <strong>Delete My Data Permanently</strong> on your private donor portal immediately erases your profile, phone number, and history from active matching tables.
              </p>
            </div>

            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ink)] mb-2">
                6. National Blood Transfusion Council (NBTC) Health Guardrails
              </h2>
              <p className="text-[var(--mu)] leading-relaxed">
                To safeguard voluntary donors from over-donation, automated cooldown periods (90 days for males and 120 days for females for whole blood, and 14 days for platelet apheresis) are programmatically enforced in database RPC functions before any donor is included in a matching wave.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Summary (4 Cols on Desktop) */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
          <div className="card space-y-4 p-5 sm:p-6 bg-[var(--sf)]">
            <h3 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
              Compliance Highlights
            </h3>
            <div className="space-y-3 text-xs text-[var(--mu)]">
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-[var(--ok)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>No phone numbers ever exposed publicly.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-[var(--ok)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Slip images purged 7 days post-donation.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-[var(--ok)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>90/120-day NBTC health cooldowns enforced.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-[var(--ok)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Single-click permanent profile deletion anytime.</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--ln)] space-y-2">
              <Link href="/join" className="btn2 w-full min-h-[42px] text-xs font-semibold flex items-center justify-center">
                Register as Voluntary Donor
              </Link>
              <Link href="/request" className="btn w-full min-h-[42px] text-xs font-semibold flex items-center justify-center">
                Submit Blood Request
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
