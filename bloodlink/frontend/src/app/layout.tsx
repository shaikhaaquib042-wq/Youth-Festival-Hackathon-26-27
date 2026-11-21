import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BloodLink Pune — Hyper-Local Verified Blood Matching",
  description:
    "Privacy-first B2B2C blood matching coordination intermediary for verified Pune hospitals and voluntary donors. NBTC & DPDP compliant.",
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
      <body className="min-h-screen">
        <div className="min-h-screen flex flex-col justify-between py-4 px-3 sm:py-6 sm:px-4">
          <main className="w-full max-w-[480px] sm:max-w-[540px] mx-auto flex-1">
            {children}
          </main>
          <footer className="w-full max-w-[480px] sm:max-w-[540px] mx-auto pt-6 pb-4 text-center text-xs text-mu space-y-1 border-t border-[var(--ln)] mt-8">
            <div className="flex items-center justify-center gap-3 font-medium">
              <a href="/request" className="hover:text-[var(--ink)]">Request</a>
              <span>•</span>
              <a href="/join" className="hover:text-[var(--ink)]">Join as Donor</a>
              <span>•</span>
              <a href="/privacy" className="hover:text-[var(--ink)]">DPDP Privacy</a>
            </div>
            <p className="text-[11px] text-mu/80">
              BloodLink Pune is a voluntary coordination intermediary under NBTC guidelines. Does not collect, test, or transport blood.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
