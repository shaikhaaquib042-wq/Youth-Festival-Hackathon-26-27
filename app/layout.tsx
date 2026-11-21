import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RaktSetu | Intelligent Urgent Blood Donor Matching',
  description:
    'RaktSetu: Real-time intelligent blood donor matching for Pune, India. 500 random forwards vs 5 intelligent matches.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-slate-100 antialiased selection:bg-blood/30 selection:text-white bg-grain">
        {children}
      </body>
    </html>
  );
}
