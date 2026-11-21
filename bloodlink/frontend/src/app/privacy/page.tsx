"use client";

import React from "react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--ln)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--tint)] text-[var(--rt)]">
            <span className="text-xl">🛡️</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--ink)]">Privacy &amp; DPDP Policy</h1>
            <p className="text-xs text-[var(--mu)]">Digital Personal Data Protection Act, 2023</p>
          </div>
        </div>
        <Link href="/" className="text-xs text-[var(--mu)] hover:text-[var(--ink)]">
          ✕ Back
        </Link>
      </div>

      <div className="card space-y-4 text-xs leading-relaxed text-[var(--ink)]">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)] mb-1">
            1. Intermediary Status &amp; Legal Scope
          </h2>
          <p className="text-[var(--mu)]">
            BloodLink operates strictly as a digital technology coordination intermediary connecting verified Pune hospitals and accredited blood centres with voluntary donors. BloodLink does not collect, test, store, process, or deliver blood or blood components. Clinical fitness is determined solely on-site by registered medical officers under the Drugs and Cosmetics Act.
          </p>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)] mb-1">
            2. Strict Purpose Limitation (Zero Marketing)
          </h2>
          <p className="text-[var(--mu)]">
            In compliance with Section 4 of the DPDP Act 2023, data is gathered strictly for calculating distance-ranked donor matching waves. We do not sell, rent, monetize, or transfer your contact data to private advertisers, third-party brokers, or pharmaceutical marketers.
          </p>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)] mb-1">
            3. Zero Public Directory Pledge
          </h2>
          <p className="text-[var(--mu)]">
            Unlike legacy donor databases, BloodLink never exposes donor phone numbers or names on public pages, search engines, or open tracking links. Communication is orchestrated through private, unguessable UUID capability tokens and automated WhatsApp webhooks.
          </p>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)] mb-1">
            4. Data Retention &amp; Automatic Slip Purge
          </h2>
          <ul className="list-disc pl-4 space-y-1 text-[var(--mu)]">
            <li>
              <strong>Hospital Requisition Slips:</strong> Official requisition photos uploaded to Supabase Storage are automatically purged 7 days after the requisition reaches <code>FULFILLED</code> or <code>EXPIRED</code> status.
            </li>
            <li>
              <strong>Donor Profiles:</strong> Maintained until you request deletion. You can pause alerts or delete your profile instantly at any time from your private donor portal.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)] mb-1">
            5. Right to Withdraw Consent &amp; Erasure
          </h2>
          <p className="text-[var(--mu)]">
            Under Section 6(4) of the DPDP Act 2023, you hold the absolute right to withdraw consent. Clicking <strong>Delete My Data Permanently</strong> on your private donor portal immediately wipes your name, phone number, locality, and past wave dispatches from active tables.
          </p>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)] mb-1">
            6. NBTC Cooldown Safeguards
          </h2>
          <p className="text-[var(--mu)]">
            To protect voluntary donors from over-donation, automated cooldown periods (90 days for males and 120 days for females for whole blood) are programmatically enforced in database RPC functions before any donor is included in a matching wave.
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Link href="/join" className="btn2 w-full min-h-[44px] text-xs font-semibold text-center flex items-center justify-center">
          Register as Donor
        </Link>
        <Link href="/request" className="btn w-full min-h-[44px] text-xs font-semibold text-center flex items-center justify-center">
          Request Blood Urgently
        </Link>
      </div>
    </div>
  );
}
