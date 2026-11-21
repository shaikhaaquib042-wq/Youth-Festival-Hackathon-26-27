'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Campus, ScheduledCamp, BloodGroup } from '@/types';
import {
  GraduationCap,
  Trophy,
  Calendar,
  Users,
  CheckCircle2,
  PlusCircle,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

const ALL_BLOOD_GROUPS: BloodGroup[] = ['O+', 'B+', 'A+', 'AB+', 'O-', 'B-', 'A-', 'AB-'];

export const CampusNetwork: React.FC = () => {
  const { data, clock, scheduleCamp } = useAppStore();

  const [selectedCollegeId, setSelectedCollegeId] = useState<string>(
    data.campuses[0]?.id || 'campus-1'
  );
  const [campDate, setCampDate] = useState<string>(
    new Date(Date.parse(clock.currentIso) + 7 * 86400000).toISOString().split('T')[0]
  );
  const [expectedDonors, setExpectedDonors] = useState<number>(75);
  const [targetGroups, setTargetGroups] = useState<BloodGroup[]>(['O+', 'B+', 'A+']);
  const [schedulerNotice, setSchedulerNotice] = useState<string | null>(null);

  // Dynamic Leaderboard: Count actual donations and donors per campus from state
  const leaderboard = useMemo(() => {
    return data.campuses.map((campus) => {
      // Find donors from this college
      const collegeDonors = data.donors.filter((d) => d.college === campus.name);
      const activeCount = collegeDonors.filter((d) => d.availabilityStatus === 'available').length;

      // Count actual successful donations from donationEvents
      const collegeDonorIds = new Set(collegeDonors.map((d) => d.id));
      const confirmedDonationsCount = data.donationEvents.filter((e) =>
        collegeDonorIds.has(e.donorId)
      ).length;

      // Composite score: activeDonors * 2 + confirmedDonations * 5
      const score = activeCount * 2 + confirmedDonationsCount * 5 + collegeDonors.length;

      return {
        ...campus,
        donorCount: collegeDonors.length,
        activeDonors: activeCount,
        successfulDonations: confirmedDonationsCount,
        score,
      };
    }).sort((a, b) => b.score - a.score);
  }, [data.campuses, data.donors, data.donationEvents]);

  const handleScheduleCamp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchedulerNotice(null);

    // Validation: no past dates
    const currentMidnight = clock.currentIso.split('T')[0];
    if (campDate < currentMidnight) {
      setSchedulerNotice('Error: Camp date cannot be in the past.');
      return;
    }

    const selectedCollege = data.campuses.find((c) => c.id === selectedCollegeId);
    if (!selectedCollege) return;

    // Check duplicate
    const exists = data.scheduledCamps.some(
      (c) => c.collegeId === selectedCollegeId && c.date === campDate
    );
    if (exists) {
      setSchedulerNotice('Notice: A donor drive is already scheduled for this college on that date.');
      return;
    }

    const newCamp: ScheduledCamp = {
      id: `camp-${Date.now()}`,
      collegeId: selectedCollegeId,
      collegeName: selectedCollege.name,
      date: campDate,
      targetGroups,
      expectedDonors,
      status: 'scheduled',
    };

    await scheduleCamp(newCamp);
    setSchedulerNotice(`Success! Pre-emptive blood drive confirmed for ${selectedCollege.name} on ${campDate}.`);
  };

  const toggleGroup = (bg: BloodGroup) => {
    if (targetGroups.includes(bg)) {
      if (targetGroups.length > 1) {
        setTargetGroups(targetGroups.filter((g) => g !== bg));
      }
    } else {
      setTargetGroups([...targetGroups, bg]);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 select-none">
      {/* Header */}
      <div className="glass-panel-elevated p-6 rounded-2xl border border-surface-border">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan/10 border border-cyan/30 text-cyan text-xs font-semibold mb-3">
          <GraduationCap className="w-4 h-4" />
          <span>YOUTH MOBILIZATION &amp; CAMPUS LEADERBOARD</span>
        </div>
        <h2 className="font-display font-bold text-2xl text-white mb-2">
          Pune Collegiate Donor Network &amp; Camp Scheduler
        </h2>
        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
          Over 40% of Pune&apos;s active donor base is registered through premier engineering and medical institutions. Competing campus chapters organize verified pre-emptive drives to insulate city blood banks before shortage windows.
        </p>
      </div>

      {/* Main Grid: Leaderboard (Left) vs Camp Scheduler (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Campus Leaderboard (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-surface-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-amber">
                <Trophy className="w-5 h-5 fill-amber" />
                <h3 className="font-display font-bold text-base text-white">
                  Campus Impact Leaderboard
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Sorted by Verified Donations
              </span>
            </div>

            <div className="space-y-3">
              {leaderboard.map((college, idx) => (
                <div
                  key={college.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    idx === 0
                      ? 'bg-amber-950/20 border-amber/40 shadow-glow-amber/30'
                      : 'bg-surface-elevated/70 border-surface-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                        idx === 0
                          ? 'bg-amber text-slate-950 font-extrabold'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-surface-border text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-display font-bold text-sm text-white">
                        {college.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {college.area} · <strong className="text-cyan">{college.donorCount}</strong> registered donors ({college.activeDonors} active)
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-emerald-400">
                      {college.successfulDonations} Done
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Score: {college.score} pts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Working Camp Scheduler (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel-elevated p-5 rounded-2xl border border-surface-border">
            <div className="flex items-center gap-2 mb-3 text-cyan">
              <Calendar className="w-5 h-5" />
              <h3 className="font-display font-bold text-base text-white">
                Schedule Pre-Emptive Drive
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Organize an on-campus blood donation camp pre-filling targeted groups before predicted citywide shortage windows.
            </p>

            <form onSubmit={handleScheduleCamp} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Host College / Chapter
                </label>
                <select
                  value={selectedCollegeId}
                  onChange={(e) => setSelectedCollegeId(e.target.value)}
                  className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan"
                >
                  {data.campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.area})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={campDate}
                    onChange={(e) => setCampDate(e.target.value)}
                    className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Expected Donors
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={300}
                    value={expectedDonors}
                    onChange={(e) => setExpectedDonors(Number(e.target.value))}
                    className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1.5">
                  Target Priority Blood Groups
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_BLOOD_GROUPS.map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => toggleGroup(bg)}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                        targetGroups.includes(bg)
                          ? 'bg-blood text-white shadow-glow-blood'
                          : 'bg-surface-elevated border border-surface-border text-slate-400 hover:text-white'
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              {schedulerNotice && (
                <div
                  className={`p-2.5 rounded-lg border text-xs font-mono flex items-center gap-2 ${
                    schedulerNotice.startsWith('Success')
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  }`}
                >
                  {schedulerNotice.startsWith('Success') ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  )}
                  <span>{schedulerNotice}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-cyan hover:bg-cyan/90 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                CONFIRM &amp; DISPATCH ROTARACT CREW
              </button>
            </form>
          </div>

          {/* Upcoming Registered Camps List */}
          <div className="glass-panel p-4 rounded-xl border border-surface-border text-xs">
            <h4 className="font-semibold text-white mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Scheduled Campus Drives ({data.scheduledCamps.length})
            </h4>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {data.scheduledCamps.map((camp) => (
                <div
                  key={camp.id}
                  className="p-2.5 rounded-lg bg-surface-elevated border border-surface-border flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">{camp.collegeName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Target: {camp.targetGroups.join(', ')} · Goal: {camp.expectedDonors} units
                    </div>
                  </div>
                  <div className="font-mono text-cyan text-[11px] font-bold">
                    {camp.date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
