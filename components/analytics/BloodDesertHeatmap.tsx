'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { BloodGroup } from '@/types';
import {
  MapPin,
  TrendingDown,
  AlertTriangle,
  Users,
  Calendar,
  ChevronRight,
  Filter,
} from 'lucide-react';

const BLOOD_GROUPS: Array<'ALL' | BloodGroup> = [
  'ALL',
  'O+',
  'B+',
  'A+',
  'AB+',
  'O-',
  'B-',
  'A-',
  'AB-',
];

export const BloodDesertHeatmap: React.FC = () => {
  const { data, clock, setActiveView, scheduleCamp } = useAppStore();
  const [selectedGroup, setSelectedGroup] = useState<'ALL' | BloodGroup>('ALL');
  const [selectedAreaForRecruitment, setSelectedAreaForRecruitment] = useState<string | null>(null);

  // Compute Gap per Locality: Demand (from historical requests) - Supply (from eligible donors)
  const localityAnalysis = useMemo(() => {
    // 1. Calculate demand per area
    const demandMap: Record<string, number> = {};
    for (const req of data.historicalRequests) {
      if (selectedGroup !== 'ALL' && req.bloodGroup !== selectedGroup) continue;
      // Map hospital to area
      const hosp = data.hospitals.find((h) => h.id === req.hospitalId);
      const area = hosp?.area.split('/')[0].trim() || 'Shivajinagar';
      demandMap[area] = (demandMap[area] || 0) + req.unitsRequired;
    }

    // 2. Calculate supply per area
    const supplyMap: Record<string, number> = {};
    for (const donor of data.donors) {
      if (selectedGroup !== 'ALL' && donor.bloodGroup !== selectedGroup) continue;
      if (donor.availabilityStatus === 'available' && donor.isOptedIn) {
        supplyMap[donor.area] = (supplyMap[donor.area] || 0) + 1;
      }
    }

    // List of 18 Pune localities
    const allAreas = Array.from(
      new Set([...data.donors.map((d) => d.area), ...Object.keys(demandMap)])
    );

    const maxDemand = Math.max(1, ...Object.values(demandMap));
    const maxSupply = Math.max(1, ...Object.values(supplyMap));

    const results = allAreas.map((area) => {
      const demandRaw = demandMap[area] || 0;
      const supplyRaw = supplyMap[area] || 0;

      const normDemand = demandRaw / maxDemand;
      const normSupply = supplyRaw / maxSupply;

      // Gap: higher positive gap means severe deficit (blood desert)
      const gap = Math.round((normDemand - normSupply * 0.7) * 100) / 100;

      return {
        area,
        demandUnits: demandRaw,
        eligibleDonors: supplyRaw,
        gap,
        isDeficit: gap > 0.15,
      };
    });

    results.sort((a, b) => b.gap - a.gap);
    return results;
  }, [data.historicalRequests, data.donors, data.hospitals, selectedGroup]);

  // Handle Recruit Donors Here action
  const handleRecruitDonors = (area: string) => {
    setSelectedAreaForRecruitment(area);
    // Find closest college
    const college = data.campuses.find((c) => c.area === area) || data.campuses[0];
    const campDate = new Date(Date.parse(clock.currentIso) + 7 * 86400000)
      .toISOString()
      .split('T')[0];

    scheduleCamp({
      id: `camp-${Date.now()}`,
      collegeId: college.id,
      collegeName: `${college.name} (${area} Rapid Drive)`,
      date: campDate,
      targetGroups: selectedGroup === 'ALL' ? ['O+', 'B+', 'A+'] : [selectedGroup],
      expectedDonors: 80,
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber/10 border border-amber/30 text-amber text-xs font-semibold mb-3">
              <MapPin className="w-4 h-4" />
              <span>GEOGRAPHIC SHORTAGE &amp; ACCESS TELEMETRY</span>
            </div>
            <h2 className="font-display font-bold text-2xl text-white mb-2">
              Pune Blood Desert &amp; Supply Deficit Heatmap
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              Identifies localities where historical emergency hospital demand significantly outpaces eligible active donor registrations: <span className="font-mono text-cyan">Gap = Demand - Supply</span>.
            </p>
          </div>

          {/* Blood Group Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-surface-elevated border border-surface-border">
            <span className="text-[11px] font-mono text-slate-400 px-2 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Group:
            </span>
            {BLOOD_GROUPS.map((bg) => (
              <button
                key={bg}
                onClick={() => setSelectedGroup(bg)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                  selectedGroup === bg
                    ? 'bg-amber text-slate-950 shadow-glow-amber'
                    : 'text-slate-400 hover:text-white hover:bg-surface'
                }`}
              >
                {bg}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Prominent Simulated Dataset Notice as required by SPEC §8.5 */}
      <div className="p-3.5 rounded-xl bg-surface-elevated border border-surface-border text-xs flex items-center justify-between text-slate-400">
        <span className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber" />
          <span>
            <strong>SIMULATED PUNE DATASET:</strong> Computational demonstration model based on synthetic requests and donor registrations. Not for official epidemiology or medical policy.
          </span>
        </span>
        <span className="font-mono text-cyan text-[11px]">18 Pune Zones Analyzed</span>
      </div>

      {/* Ranked Locality Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {localityAnalysis.slice(0, 9).map((item, index) => {
          const isTopDeficit = index < 3;
          return (
            <div
              key={item.area}
              className={`glass-panel p-4 rounded-xl border transition-all ${
                isTopDeficit
                  ? 'border-red-500/30 bg-red-950/10 shadow-glow-blood/50'
                  : 'border-surface-border bg-surface-elevated/40'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500">#{index + 1}</span>
                    <h4 className="font-display font-bold text-sm text-white">{item.area}</h4>
                  </div>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isTopDeficit
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : item.isDeficit
                        ? 'bg-amber/20 text-amber border border-amber/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {isTopDeficit
                      ? 'HIGH SHORTAGE ZONE'
                      : item.isDeficit
                      ? 'MODERATE DEFICIT'
                      : 'EQUILIBRIUM'}
                  </span>
                </div>

                <div className="text-right font-mono">
                  <div className="text-[10px] text-slate-400">DEFICIT GAP</div>
                  <div className={`text-base font-bold ${item.gap > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {item.gap > 0 ? `+${item.gap}` : item.gap}
                  </div>
                </div>
              </div>

              {/* Progress bars comparing demand vs supply */}
              <div className="space-y-2 my-3 text-[11px] font-mono">
                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>Emergency Demand</span>
                    <span className="text-white">{item.demandUnits} units</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-border overflow-hidden">
                    <div
                      className="h-full bg-blood rounded-full"
                      style={{ width: `${Math.min(100, item.demandUnits * 8)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>Eligible Donors</span>
                    <span className="text-cyan">{item.eligibleDonors} available</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-border overflow-hidden">
                    <div
                      className="h-full bg-cyan rounded-full"
                      style={{ width: `${Math.min(100, item.eligibleDonors * 5)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Button: Recruit Donors Here */}
              <button
                onClick={() => handleRecruitDonors(item.area)}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-surface-elevated hover:bg-surface-border text-cyan text-xs font-semibold border border-cyan/30 flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  RECRUIT DONORS HERE
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
