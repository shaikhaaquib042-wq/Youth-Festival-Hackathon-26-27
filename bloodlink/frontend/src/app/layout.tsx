import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "BloodLink Pune — Hyper-Local Verified Blood Matching Platform",
  description:
    "B2B2C voluntary blood matching intermediary connecting verified Pune hospitals and licensed blood centres with nearby eligible donors. NBTC & DPDP compliant.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#C62828",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col">
        {/* Navigation Bar */}
        <header className="w-full bg-[var(--sf)] border-b border-[var(--ln)] sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Platform Brand */}
            <Link href="/request" className="flex items-center gap-2.5">
              <span className="font-bold text-base tracking-tight text-[var(--ink)]">BloodLink</span>
              <span className="tg ok text-[10px] uppercase font-bold py-0.5 px-2">Pune</span>
            </Link>

            {/* Functional Navigation */}
            <nav className="flex items-center gap-6 text-xs font-semibold text-[var(--mu)]">
              <Link href="/request" className="hover:text-[var(--ink)] transition-colors">
                Request Blood
              </Link>
              <Link href="/join" className="hover:text-[var(--ink)] transition-colors">
                Join as Donor
              </Link>
              <Link href="/privacy" className="hover:text-[var(--ink)] transition-colors">
                Privacy
              </Link>
            </nav>

            {/* Direct Action */}
            <div className="flex items-center gap-3">
              <Link
                href="/request"
                className="btn text-xs font-semibold min-h-[40px] px-4 py-1.5"
              >
                Submit Requisition
              </Link>
            </div>
          </div>
        </header>

        {/* Responsive Desktop & Mobile Main Body */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        {/* Mandated Legal Intermediary Footer (PRD Section 1.2) */}
        <footer className="w-full bg-[var(--sf)] border-t border-[var(--ln)] py-6 text-xs text-[var(--mu)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] leading-relaxed max-w-2xl">
              BloodLink operates strictly as a voluntary coordination intermediary under National Blood Transfusion Council (NBTC) guidelines. Does not collect, test, store, or transport blood.
            </p>
            <div className="flex items-center gap-4 text-[11px]">
              <Link href="/privacy" className="hover:underline">DPDP Compliance</Link>
              <span>•</span>
              <Link href="/request" className="hover:underline">Intake</Link>
              <span>•</span>
              <Link href="/join" className="hover:underline">Donors</Link>
              <span>•</span>
              <Link href="/demo-tools" className="hover:underline font-semibold text-[var(--ink)]">Demo Tools</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
