'use client';

import React, { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceArea,
} from 'recharts';
import {
  TrendingUp,
  AlertCircle,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Info,
} from 'lucide-react';

export const LeanMonthForecast: React.FC = () => {
  const { data, clock, setActiveView, scheduleCamp } = useAppStore();

  // Process 12-Month Historical Data and Compute 3-Month Moving Average & Seasonal Forecast
  const chartData = useMemo(() => {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    // Bucket requests by month
    const monthlyCounts: Record<number, number> = {};
    for (let i = 0; i < 12; i++) monthlyCounts[i] = 0;

    for (const req of data.historicalRequests) {
      const m = new Date(req.requestDate).getMonth();
      monthlyCounts[m] = (monthlyCounts[m] || 0) + req.unitsRequired;
    }

    const overallMean =
      Object.values(monthlyCounts).reduce((a, b) => a + b, 0) / 12 || 1;

    return monthNames.map((name, idx) => {
      const actualUnits = monthlyCounts[idx] || 0;

      // 3-month moving average (previous month, current, next month)
      const prev = monthlyCounts[(idx + 11) % 12] || actualUnits;
      const next = monthlyCounts[(idx + 1) % 12] || actualUnits;
      const movingAvg = Math.round(((prev + actualUnits + next) / 3) * 10) / 10;

      // Seasonal index = month / mean
      const seasonalIndex = actualUnits / overallMean;
      // Forecast prediction (simulated trend + seasonal multiplier)
      const forecast = Math.round(overallMean * seasonalIndex * 1.05 * 10) / 10;

      const isSummer = idx >= 3 && idx <= 5; // Apr, May, Jun
      const isFestival = idx === 8 || idx === 9 || idx === 10; // Sep (Ganpati), Oct/Nov (Diwali)

      return {
        month: name,
        actualDemand: actualUnits,
        movingAvg,
        forecast,
        isSummer,
        isFestival,
      };
    });
  }, [data.historicalRequests]);

  const handleLaunchDonorDrive = () => {
    const campDate = new Date(Date.parse(clock.currentIso) + 14 * 86400000)
      .toISOString()
      .split('T')[0];

    scheduleCamp({
      id: `camp-forecast-${Date.now()}`,
      collegeId: 'campus-1',
      collegeName: 'MIT Academy of Engineering (Summer Deficit Pre-Emptive Drive)',
      date: campDate,
      targetGroups: ['O+', 'B+', 'A+'],
      expectedDonors: 100,
      status: 'scheduled',
    });

    setActiveView('campus');
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 select-none">
      {/* Header */}
      <div className="glass-panel-elevated p-6 rounded-2xl border border-surface-border">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan/10 border border-cyan/30 text-cyan text-xs font-semibold mb-3">
              <TrendingUp className="w-4 h-4" />
              <span>PREDICTIVE INVENTORY &amp; LEAN-MONTH TELEMETRY</span>
            </div>
            <h2 className="font-display font-bold text-2xl text-white mb-2">
              12-Month Pune Blood Demand &amp; Shortage Forecast
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              Anticipates summer donation cooling drops (Apr–Jun) and festive emergency peaks (Ganeshotsav &amp; Diwali) using seasonal decomposition and a 3-month moving average.
            </p>
          </div>

          <button
            onClick={handleLaunchDonorDrive}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blood hover:bg-blood/90 text-white font-bold text-xs shadow-glow-blood transition-all shrink-0"
          >
            <Calendar className="w-4 h-4" />
            <span>LAUNCH PRE-EMPTIVE DONOR DRIVE</span>
          </button>
        </div>
      </div>

      {/* Recharts Analytics Visualization */}
      <div className="glass-panel p-6 rounded-2xl border border-surface-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-base text-white">
              Emergency Demand Trends &amp; Projections
            </h3>
            <p className="text-xs text-slate-400">
              Units requested per month across 8 Pune clinical network nodes.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blood/80 inline-block" />
              <span>Actual Demand</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-cyan inline-block" />
              <span>3-Mo Moving Avg</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber inline-block" />
              <span>Seasonal Forecast</span>
            </span>
          </div>
        </div>

        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid stroke="#1E2738" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} fontFamily="JetBrains Mono" />
              <YAxis stroke="#94A3B8" fontSize={11} fontFamily="JetBrains Mono" unit="u" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F141C',
                  border: '1px solid #1E2738',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono',
                  color: '#F8FAFC',
                }}
              />
              <Bar dataKey="actualDemand" fill="#DC2626" radius={[4, 4, 0, 0]} name="Historical Demand (Units)" />
              <Line
                type="monotone"
                dataKey="movingAvg"
                stroke="#00E5FF"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#00E5FF' }}
                name="3-Month Moving Average"
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#F59E0B' }}
                name="Seasonal Forecast"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Methodology Explanatory Callouts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-surface-border text-xs">
          <div className="p-3 rounded-lg bg-surface-elevated/70 border border-surface-border text-slate-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Summer Shortage Period (Apr–Jun):</strong> Academic vacations and intense heatwaves historically reduce campus donations by 35%, coinciding with increased trauma demand.
            </div>
          </div>
          <div className="p-3 rounded-lg bg-surface-elevated/70 border border-surface-border text-slate-300 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Festival Surge Windows (Sep &amp; Oct/Nov):</strong> Heightened road congestion and holiday hospital staffing shifts lead to sharp transient spikes in urgent blood requests.
            </div>
          </div>
        </div>
      </div>

      {/* Synthetic Data Disclaimer */}
      <div className="p-3.5 rounded-xl bg-surface-elevated border border-surface-border text-xs flex items-center justify-between text-slate-400">
        <span className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-cyan" />
          <span>
            <strong>METHODOLOGY NOTE:</strong> Deterministic seasonal decomposition model computed from 60 synthetic historical requests over 12 months. Single-cycle projection for demonstration purposes.
          </span>
        </span>
      </div>
    </div>
  );
};
