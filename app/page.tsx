export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="glass-panel p-8 rounded-2xl max-w-lg border border-surface-border">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blood/10 border border-blood/30 text-blood text-xs font-semibold mb-4">
          <span className="w-2 h-2 rounded-full bg-blood animate-pulse" />
          RAKTSETU COMMAND CENTER
        </div>
        <h1 className="text-3xl font-bold font-display text-white mb-2">
          Connecting Every Drop. Saving Every Moment.
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          500 random forwards vs 5 intelligent matches.
        </p>
        <div className="text-xs font-mono text-cyan/90 bg-surface-elevated/60 p-3 rounded-lg border border-surface-border">
          Status: Phase 1 Foundation Verified · Seeded 300 Donors, 8 Hospitals
        </div>
      </div>
    </main>
  );
}
