'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ColumnLayer } from '@deck.gl/layers';
import { ScatterplotLayer } from '@deck.gl/layers';
import { ArcLayer } from '@deck.gl/layers';
import { Donor, Hospital, BloodRequest, BloodGroup } from '@/types';
import { CONFIG } from '@/lib/config';
import { SvgMapFallback } from './SvgMapFallback';

interface MapLibreDeckMapProps {
  donors: Donor[];
  hospitals: Hospital[];
  activeRequest: BloodRequest | null;
  selectedBloodGroup: 'ALL' | BloodGroup;
  onSelectHospital?: (hospital: Hospital) => void;
}

export const MapLibreDeckMap: React.FC<MapLibreDeckMapProps> = ({
  donors,
  hospitals,
  activeRequest,
  selectedBloodGroup,
  onSelectHospital,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [hasWebGlError, setHasWebGlError] = useState(false);
  const [tileErrorNotice, setTileErrorNotice] = useState<string | null>(null);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Pulse animation loop for active request rings
  useEffect(() => {
    let animId: number;
    let start = performance.now();
    const animate = (time: number) => {
      const elapsed = (time - start) / 1000;
      setPulsePhase((elapsed % 2) / 2);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Filtered donors
  const filteredDonors = useMemo(() => {
    if (selectedBloodGroup === 'ALL') return donors;
    return donors.filter((d) => d.bloodGroup === selectedBloodGroup);
  }, [donors, selectedBloodGroup]);

  // Aggregated column data by locality
  const localityDensity = useMemo(() => {
    const map = new Map<string, { name: string; lat: number; lng: number; count: number }>();
    for (const d of filteredDonors) {
      const existing = map.get(d.area);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(d.area, {
          name: d.area,
          lat: d.latitude,
          lng: d.longitude,
          count: 1,
        });
      }
    }
    return Array.from(map.values());
  }, [filteredDonors]);

  // Request hospital
  const reqHospital = useMemo(() => {
    if (!activeRequest) return null;
    return hospitals.find((h) => h.id === activeRequest.hospitalId) || null;
  }, [activeRequest, hospitals]);

  // Coarse privacy-preserving locations for matched donors (snapped to ~1 km grid)
  const matchedDonorsData = useMemo(() => {
    if (!activeRequest || !activeRequest.notifiedDonorIds) return [];
    return activeRequest.notifiedDonorIds
      .map((id) => {
        const donor = donors.find((d) => d.id === id);
        if (!donor) return null;
        const coarseLat = Math.round(donor.latitude * 100) / 100;
        const coarseLng = Math.round(donor.longitude * 100) / 100;
        const isAccepted = activeRequest.acceptedDonorIds.includes(donor.id);
        return {
          id: donor.id,
          position: [coarseLng, coarseLat] as [number, number],
          isAccepted,
          bloodGroup: donor.bloodGroup,
        };
      })
      .filter((d): d is { id: string; position: [number, number]; isAccepted: boolean; bloodGroup: BloodGroup } => d !== null);
  }, [activeRequest, donors]);

  // Arc data from request hospital to matched donors
  const arcData = useMemo(() => {
    if (!reqHospital || matchedDonorsData.length === 0) return [];
    return matchedDonorsData.map((d) => ({
      source: [reqHospital.longitude, reqHospital.latitude] as [number, number],
      target: d.position,
      isAccepted: d.isAccepted,
    }));
  }, [reqHospital, matchedDonorsData]);

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: CONFIG.MAP_STYLE_URL,
        center: [CONFIG.PUNE_CENTER.longitude, CONFIG.PUNE_CENTER.latitude],
        zoom: CONFIG.PUNE_CENTER.zoom,
        pitch: CONFIG.PUNE_CENTER.pitch,
        bearing: CONFIG.PUNE_CENTER.bearing,
        antialias: true,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

      map.on('error', (e) => {
        if (e.error?.message?.includes('tile') || e.error?.message?.includes('fetch')) {
          setTileErrorNotice('Basemap tile network timeout · Offline vector grid active');
        }
      });

      const overlay = new MapboxOverlay({
        interleaved: false,
        layers: [],
      });

      map.addControl(overlay);
      overlayRef.current = overlay;
      mapRef.current = map;
    } catch (err) {
      console.warn('WebGL Initialization failed, switching to 2D tactical fallback:', err);
      setHasWebGlError(true);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update deck.gl layers when state changes
  useEffect(() => {
    if (!overlayRef.current) return;

    const numericTier = typeof activeRequest?.tier === 'number' ? activeRequest.tier : 0;
    const isRare = activeRequest?.tier === 'rare';

    const escalationRingsData: Array<{ radius: number; color: [number, number, number, number] }> = [];
    if (reqHospital && activeRequest) {
      if (isRare || numericTier >= 1) {
        escalationRingsData.push({ radius: 5000, color: [220, 38, 38, 160] });
      }
      if (isRare || numericTier >= 2) {
        escalationRingsData.push({ radius: 10000, color: [245, 158, 11, 140] });
      }
      if (isRare || numericTier >= 3) {
        escalationRingsData.push({ radius: 25000, color: [0, 229, 255, 100] });
      }
    }

    const layers = [
      new ColumnLayer({
        id: 'donor-density-columns',
        data: localityDensity,
        diskResolution: 12,
        radius: 450,
        extruded: true,
        pickable: true,
        elevationScale: 40,
        getPosition: (d: { lng: number; lat: number }) => [d.lng, d.lat],
        getElevation: (d: { count: number }) => d.count,
        getFillColor: (d: { count: number }) => {
          const intensity = Math.min(255, 100 + d.count * 8);
          return [0, intensity, 255, 175];
        },
        getLineColor: [0, 240, 255, 230],
        lineWidthMinPixels: 1.5,
      }),

      new ScatterplotLayer({
        id: 'hospital-markers',
        data: hospitals,
        pickable: true,
        opacity: 0.9,
        stroked: true,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 6,
        radiusMaxPixels: 16,
        lineWidthMinPixels: 2,
        getPosition: (h: Hospital) => [h.longitude, h.latitude],
        getRadius: 280,
        getFillColor: [220, 38, 38, 240],
        getLineColor: [255, 255, 255, 220],
        onClick: (info) => {
          if (info.object && onSelectHospital) {
            onSelectHospital(info.object as Hospital);
          }
        },
      }),

      ...(reqHospital
        ? [
            new ScatterplotLayer({
              id: 'request-pulse-ring',
              data: [reqHospital],
              pickable: false,
              stroked: true,
              filled: true,
              radiusMinPixels: 8,
              radiusMaxPixels: 80,
              getPosition: (h: Hospital) => [h.longitude, h.latitude],
              getRadius: 300 + pulsePhase * 1800,
              getFillColor: [255, 42, 77, Math.floor((1 - pulsePhase) * 120)],
              getLineColor: [255, 42, 77, Math.floor((1 - pulsePhase) * 255)],
              lineWidthMinPixels: 2,
            }),
          ]
        : []),

      ...(reqHospital && escalationRingsData.length > 0
        ? [
            new ScatterplotLayer({
              id: 'escalation-rings',
              data: escalationRingsData,
              pickable: false,
              stroked: true,
              filled: false,
              lineWidthMinPixels: 1.5,
              getPosition: () => [reqHospital.longitude, reqHospital.latitude],
              getRadius: (d: { radius: number }) => d.radius,
              getLineColor: (d: { color: [number, number, number, number] }) => d.color,
            }),
          ]
        : []),

      new ScatterplotLayer({
        id: 'matched-donors-layer',
        data: matchedDonorsData,
        pickable: true,
        opacity: 0.95,
        stroked: true,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 5,
        radiusMaxPixels: 14,
        lineWidthMinPixels: 2,
        getPosition: (d: { position: [number, number] }) => d.position,
        getRadius: 220,
        getFillColor: (d: { isAccepted: boolean }) =>
          d.isAccepted ? [0, 240, 255, 240] : [245, 158, 11, 220],
        getLineColor: [255, 255, 255, 200],
      }),

      new ArcLayer({
        id: 'donor-matching-arcs',
        data: arcData,
        pickable: false,
        getWidth: 2.5,
        getSourcePosition: (d: { source: [number, number] }) => d.source,
        getTargetPosition: (d: { target: [number, number] }) => d.target,
        getSourceColor: [220, 38, 38, 230],
        getTargetColor: (d: { isAccepted: boolean }) =>
          d.isAccepted ? [0, 229, 255, 240] : [245, 158, 11, 190],
      }),
    ];

    overlayRef.current.setProps({ layers });
  }, [localityDensity, hospitals, reqHospital, activeRequest, pulsePhase, matchedDonorsData, arcData, onSelectHospital]);

  useEffect(() => {
    if (mapRef.current && reqHospital) {
      mapRef.current.flyTo({
        center: [reqHospital.longitude, reqHospital.latitude],
        zoom: 12.8,
        pitch: 55,
        essential: true,
        duration: 1200,
      });
    }
  }, [reqHospital]);

  if (hasWebGlError) {
    return (
      <SvgMapFallback
        donors={filteredDonors}
        hospitals={hospitals}
        activeRequest={activeRequest}
      />
    );
  }

  return (
    <div className="relative w-full h-full min-h-[580px] rounded-xl overflow-hidden border border-surface-border bg-background">
      {tileErrorNotice && (
        <div className="absolute top-3 left-3 z-20 glass-panel px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>{tileErrorNotice}</span>
        </div>
      )}

      <div ref={mapContainerRef} className="w-full h-full min-h-[580px]" />

      <div className="absolute bottom-4 left-4 z-10 glass-panel p-3 rounded-lg border border-surface-border text-xs flex flex-col gap-2 pointer-events-none select-none">
        <div className="font-semibold text-slate-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
          <span>TACTICAL MAP TELEMETRY</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-cyan/80 inline-block" />
            <span>Donor Density ({filteredDonors.length})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blood inline-block" />
            <span>Hospital Nodes (8)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber inline-block" />
            <span>Tier Escalation (5/10/25 km)</span>
          </span>
        </div>
      </div>
    </div>
  );
};
