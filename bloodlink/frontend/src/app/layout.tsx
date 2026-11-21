import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "BloodLink Pune — Hyper-Local Verified Blood Matching Platform",
  description:
    "Privacy-first B2B2C blood matching coordination intermediary connecting verified Pune hospitals and voluntary donors. NBTC & DPDP compliant.",
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
      <body className="min-h-screen bg-[var(--pg)] text-[var(--ink)] flex flex-col">
        {/* Full-width Responsive Desktop Navbar */}
        <header className="w-full bg-[var(--sf)] border-b border-[var(--ln)] sticky top-0 z-40 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Brand Logo & Region */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-[var(--tint)] text-[var(--rt)] flex items-center justify-center flex-none group-hover:scale-105 transition-transform">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                  <path d="M12 2s7 7.2 7 12a7 7 0 0 1-14 0c0-4.8 7-12 7-12z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-extrabold tracking-tight text-[var(--ink)]">BloodLink</span>
                  <span className="tg ok text-[10px] uppercase font-bold py-0.5 px-2">Pune v1</span>
                </div>
                <p className="text-[11px] text-[var(--mu)] hidden sm:block">Verified Hospital &amp; Voluntary Donor Network</p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[var(--mu)]">
              <Link href="/request" className="hover:text-[var(--ink)] transition-colors">
                Request Blood
              </Link>
              <Link href="/join" className="hover:text-[var(--ink)] transition-colors">
                Join as Donor
              </Link>
              <Link href="/privacy" className="hover:text-[var(--ink)] transition-colors">
                DPDP Privacy
              </Link>
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Link
                href="/join"
                className="hidden sm:inline-flex btn2 text-xs font-semibold min-h-[38px] px-3.5 py-1.5"
              >
                Become a Donor
              </Link>
              <Link
                href="/request"
                className="btn text-xs font-semibold min-h-[38px] px-4 py-1.5 flex items-center gap-1.5 shadow-xs"
              >
                <span>🩸</span> Urgent Request
              </Link>
            </div>
          </div>
        </header>

        {/* Responsive Full-Width Main Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>

        {/* Full-width Responsive Desktop Footer */}
        <footer className="w-full bg-[var(--sf)] border-t border-[var(--ln)] mt-12 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-[var(--ln)] text-xs">
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[var(--tint)] text-[var(--rt)] flex items-center justify-center font-bold">
                    🩸
                  </div>
                  <span className="font-bold text-sm text-[var(--ink)]">BloodLink Pune</span>
                </div>
                <p className="text-[var(--mu)] leading-relaxed max-w-md">
                  Hyper-local B2B2C voluntary blood matching platform connecting verified Pune hospitals and licensed blood centres with nearby eligible donors. Zero marketing spam, zero phone exposure, full NBTC &amp; DPDP compliance.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-[var(--ink)] text-[11px]">Rollout Clusters</h4>
                <ul className="space-y-1 text-[var(--mu)]">
                  <li>Deccan Gymkhana &amp; Erandwane</li>
                  <li>Sinhagad Road &amp; Dhankawadi</li>
                  <li>Sadashiv Peth &amp; Swargate</li>
                  <li>Sassoon Road &amp; Camp</li>
                  <li>Kothrud &amp; Karve Nagar</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-[var(--ink)] text-[11px]">Emergency &amp; Legal</h4>
                <ul className="space-y-1 text-[var(--mu)]">
                  <li>
                    <a href="https://www.eraktkosh.in" target="_blank" rel="noreferrer" className="hover:underline">
                      e-RaktKosh National Portal ↗
                    </a>
                  </li>
                  <li>
                    <Link href="/privacy" className="hover:underline">
                      DPDP Act 2023 Compliance
                    </Link>
                  </li>
                  <li>
                    <span className="text-[var(--mu)]">NBTC Cooldown Protocols</span>
                  </li>
                  <li>
                    <Link href="/request" className="hover:underline">
                      Hospital Requisition Desk
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[var(--mu)] gap-3">
              <p>
                © 2026 BloodLink. Voluntary coordination intermediary under Indian NBTC guidelines. Does not collect, test, or transport blood.
              </p>
              <div className="flex items-center gap-4">
                <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
                <span>•</span>
                <Link href="/request" className="hover:underline">Request Portal</Link>
                <span>•</span>
                <Link href="/join" className="hover:underline">Donor Registry</Link>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
