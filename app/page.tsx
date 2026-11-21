'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/store/useAppStore';
import { Navbar } from '@/components/layout/Navbar';
import { RequestSidePanel } from '@/components/map/RequestSidePanel';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import seedJson from '@/data/seed.json';
import { AppDataStore, BloodRequest } from '@/types';

const seedData = seedJson as unknown as AppDataStore;

// Dynamic import of MapLibreDeckMap with ssr: false as required by SPEC §2
const MapLibreDeckMap = dynamic(
  () => import('@/components/map/MapLibreDeckMap').then((mod) => mod.MapLibreDeckMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[580px] flex flex-col items-center justify-center glass-panel rounded-xl border border-surface-border">
        <span className="w-3 h-3 rounded-full bg-cyan animate-ping mb-3" />
        <span className="text-xs font-mono text-cyan">Initializing 3D Geospatial Engine...</span>
      </div>
    ),
  }
);

export default function HomePage() {
  const { data, ui, initialize, setActiveView, createRequest, setActiveRequestId } = useAppStore();
  const [, setIsDemoRunning] = useState(false);

  // Initialize store with seed data if empty
  useEffect(() => {
    if (!data.donors || data.donors.length === 0) {
      const initialStore: AppDataStore = {
        version: seedData.version,
        seedHash: seedData.seedHash,
        donors: seedData.donors,
        hospitals: seedData.hospitals,
        bloodBanks: seedData.bloodBanks,
        requests: seedData.requests,
        notifications: seedData.notifications,
        donationEvents: seedData.donationEvents,
        auditLogs: seedData.auditLogs,
        historicalRequests: seedData.historicalRequests,
        campuses: seedData.campuses,
        scheduledCamps: seedData.scheduledCamps,
      };
      initialize(initialStore);

      // Seed an initial demo request at Ruby Hall Clinic if none exists
      if (initialStore.requests.length === 0) {
        const rubyHall = seedData.hospitals.find((h) => h.name.includes('Ruby Hall')) || seedData.hospitals[0];
        const defaultReq: BloodRequest = {
          id: 'req-live-01',
          bloodGroup: 'B+',
          units: 2,
          hospitalId: rubyHall.id,
          urgency: 'critical',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
          status: 'matching',
          verifiedBy: 'Dr. A. K. Joshi (Chief Medical Officer)',
          verificationStatus: 'verified',
          tier: 1,
          acceptedDonorIds: [],
          notifiedDonorIds: [],
          fulfilledUnits: 0,
          requester: {
            name: 'Pooja Deshmukh',
            phone: '+91 98220 12345',
            hospitalPatientId: 'RHC-2026-9812',
          },
          verificationCode: 'RHC-7824',
        };
        createRequest(defaultReq);
        setActiveRequestId(defaultReq.id);
      }
    }
  }, [data.donors, initialize, createRequest, setActiveRequestId]);

  const activeRequest = data.requests.find((r) => r.id === ui.activeRequestId) || data.requests[0] || null;

  const handleRunDemo = () => {
    setIsDemoRunning(true);
    setActiveView('impact');
  };

  return (
    <div
      className={`min-h-screen flex flex-col bg-background text-slate-100 ${
        ui.isPresenterMode ? 'text-base font-normal contrast-125' : 'text-sm'
      }`}
    >
      {/* Top Navbar */}
      <Navbar onRunDemo={handleRunDemo} />

      {/* Main Command Center Layout */}
      <main className="flex-1 p-3 md:p-4 max-w-[1920px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 overflow-hidden">
        {/* Left Side: 3D Map (8 Cols) */}
        <section className="lg:col-span-8 flex flex-col h-[65vh] lg:h-[calc(100vh-6.5rem)] min-h-[500px]">
          <ErrorBoundary
            fallbackTitle="3D Map Engine Offline"
            fallbackMessage="Switching safely to 2D tactical vector mode."
          >
            <MapLibreDeckMap
              donors={data.donors}
              hospitals={data.hospitals}
              activeRequest={activeRequest}
              selectedBloodGroup={ui.selectedBloodGroup}
            />
          </ErrorBoundary>
        </section>

        {/* Right Side: Emergency Operations Side Panel (4 Cols) */}
        <aside className="lg:col-span-4 flex flex-col h-auto lg:h-[calc(100vh-6.5rem)] min-h-[480px]">
          <ErrorBoundary
            fallbackTitle="Side Panel Error"
            fallbackMessage="Recovering live telemetry feed."
          >
            <RequestSidePanel
              onOpenCreateRequest={() => setActiveView('request')}
              onOpenPhoneMock={() => setActiveView('donor')}
              onRunDemo={handleRunDemo}
            />
          </ErrorBoundary>
        </aside>
      </main>
    </div>
  );
}
