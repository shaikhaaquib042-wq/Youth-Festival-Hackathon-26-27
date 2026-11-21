'use client';

import React from 'react';
import { useAppStore, ActiveView } from '@/store/useAppStore';
import {
  Activity,
  PlusCircle,
  Smartphone,
  BarChart2,
  MapPin,
  TrendingUp,
  GraduationCap,
  ShieldCheck,
  Play,
  FastForward,
  Pause,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface NavbarProps {
  onRunDemo: () => void;
}

const NAV_ITEMS: { view: ActiveView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { view: 'map', label: 'Live Ops', icon: Activity },
  { view: 'request', label: 'Create Request', icon: PlusCircle },
  { view: 'donor', label: 'Phone Mock', icon: Smartphone },
  { view: 'impact', label: 'Impact (500 vs 5)', icon: BarChart2 },
  { view: 'heatmap', label: 'Blood Desert', icon: MapPin },
  { view: 'forecast', label: 'Lean-Month Forecast', icon: TrendingUp },
  { view: 'campus', label: 'Campus Network', icon: GraduationCap },
  { view: 'privacy', label: 'Privacy Center', icon: ShieldCheck },
];

export const Navbar: React.FC<NavbarProps> = ({ onRunDemo }) => {
  const { data, ui, clock, setActiveView, advanceClock, setClockSpeed, toggleClockPause, togglePresenterMode } =
    useAppStore();

  const formattedClock = React.useMemo(() => {
    const d = new Date(clock.currentIso);
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    });
  }, [clock.currentIso]);

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-surface-border select-none">
      <div className="max-w-[1920px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Branding & Value Proposition */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-blood/20 border border-blood/40 shadow-glow-blood">
            <span className="w-2.5 h-2.5 rounded-full bg-blood-glow animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-lg tracking-wider text-white">
                RAKT<span className="text-blood-glow">SETU</span>
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-cyan/15 text-cyan border border-cyan/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden md:block">
              500 random forwards vs 5 intelligent matches
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
          {NAV_ITEMS.map(({ view, label, icon: Icon }) => {
            const isActive = ui.activeView === view;
            return (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-surface-elevated text-white border border-surface-border shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan' : 'text-slate-500'}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Controls: Telemetry, Simulated Clock & Demo Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Simulated Clock Bar */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-elevated border border-surface-border text-xs font-mono">
            <span className="text-slate-400">SIM CLOCK:</span>
            <span className="text-white font-bold">{formattedClock}</span>
            <div className="flex items-center gap-1 pl-1 border-l border-surface-border">
              <button
                onClick={toggleClockPause}
                title={clock.isPaused ? 'Resume Clock' : 'Pause Clock'}
                aria-label={clock.isPaused ? 'Resume Clock' : 'Pause Clock'}
                className="p-1 hover:text-white text-slate-400"
              >
                {clock.isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3" />}
              </button>
              <button
                onClick={() => setClockSpeed(clock.speed === 1 ? 5 : clock.speed === 5 ? 20 : 1)}
                title="Cycle Clock Speed"
                aria-label="Cycle Clock Speed"
                className="px-1 py-0.5 rounded text-[10px] bg-surface hover:bg-surface-border text-cyan font-bold"
              >
                {clock.speed}x
              </button>
              <button
                onClick={() => advanceClock(10)}
                title="Fast forward +10 minutes"
                aria-label="Fast forward 10 minutes"
                className="p-1 hover:text-amber text-slate-400"
              >
                <FastForward className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Presenter Mode Toggle */}
          <button
            onClick={togglePresenterMode}
            title={ui.isPresenterMode ? 'Exit Presenter Mode' : 'Enter Presenter Mode (Larger Contrast)'}
            aria-label={ui.isPresenterMode ? 'Exit Presenter Mode' : 'Enter Presenter Mode (Larger Contrast)'}
            className={`p-2 rounded-lg border transition-colors ${
              ui.isPresenterMode
                ? 'bg-amber/20 border-amber text-amber'
                : 'bg-surface-elevated border-surface-border text-slate-400 hover:text-white'
            }`}
          >
            {ui.isPresenterMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Run Demo Hero Button */}
          <button
            onClick={onRunDemo}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blood hover:bg-blood-glow text-white text-xs font-bold font-display shadow-glow-blood transition-all transform active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>RUN DEMO</span>
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer Row */}
      <div className="lg:hidden flex items-center gap-1 px-4 py-2 overflow-x-auto border-t border-surface-border/50 bg-surface/80">
        {NAV_ITEMS.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] whitespace-nowrap ${
              ui.activeView === view ? 'bg-surface-elevated text-cyan font-bold' : 'text-slate-400'
            }`}
          >
            <Icon className="w-3 h-3" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </header>
  );
};
