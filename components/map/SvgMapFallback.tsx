'use client';

import React from 'react';
import { Donor, Hospital, BloodRequest } from '@/types';

interface SvgMapFallbackProps {
  donors: Donor[];
  hospitals: Hospital[];
  activeRequest?: BloodRequest | null;
  onLocalitySelect?: (locality: string) => void;
}

// Normalized bounds for Pune metro area
const MIN_LAT = 18.44;
const MAX_LAT = 18.68;
const MIN_LNG = 73.72;
const MAX_LNG = 73.96;

function projectCoords(lat: number, lng: number, width: number, height: number) {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * (width - 120) + 60;
  // Latitude increases upwards, so y is inverted
  const y = height - (((lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * (height - 120) + 60);
  return { x, y };
}

export const SvgMapFallback: React.FC<SvgMapFallbackProps> = ({
  donors,
  hospitals,
  activeRequest,
}) => {
  const width = 900;
  const height = 650;

  // Group donors by area
  const areaCounts = donors.reduce((acc: Record<string, { count: number; lat: number; lng: number }>, d) => {
    if (!acc[d.area]) {
      acc[d.area] = { count: 0, lat: d.latitude, lng: d.longitude };
    }
    acc[d.area].count += 1;
    return acc;
  }, {});

  const reqHospital = hospitals.find((h) => h.id === activeRequest?.hospitalId);
  const reqCoords = reqHospital ? projectCoords(reqHospital.latitude, reqHospital.longitude, width, height) : null;

  return (
    <div className="relative w-full h-full min-h-[600px] flex flex-col items-center justify-center bg-background p-4 rounded-xl border border-surface-border overflow-hidden">
      <div className="absolute top-4 left-4 z-10 glass-panel px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span>2D Tactical Fallback Mode (WebGL Unavailable / Low Power)</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full max-h-[700px] select-none">
        <defs>
          <radialGradient id="grid-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#080B10" stopOpacity="0" />
          </radialGradient>
          <filter id="glow-red">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Tactical Grid Background */}
        <rect width={width} height={height} fill="#0A0E17" />
        <circle cx={width / 2} cy={height / 2} r={height / 2.2} fill="url(#grid-glow)" />

        {/* Concentric distance rings around Pune Center */}
        {[100, 200, 300].map((radius, i) => (
          <circle
            key={i}
            cx={width / 2}
            cy={height / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="4 4"
          />
        ))}

        {/* Escalation Rings around active request hospital */}
        {reqCoords && activeRequest && (
          <>
            <circle
              cx={reqCoords.x}
              cy={reqCoords.y}
              r={70}
              fill="rgba(220, 38, 38, 0.08)"
              stroke="#DC2626"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              className="animate-pulse"
            />
            <circle
              cx={reqCoords.x}
              cy={reqCoords.y}
              r={130}
              fill="rgba(245, 158, 11, 0.04)"
              stroke="#F59E0B"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          </>
        )}

        {/* Connecting arcs to matched donors */}
        {reqCoords &&
          activeRequest &&
          activeRequest.notifiedDonorIds.map((donorId, idx) => {
            const d = donors.find((dn) => dn.id === donorId);
            if (!d) return null;
            const dCoords = projectCoords(d.latitude, d.longitude, width, height);
            return (
              <path
                key={idx}
                d={`M ${reqCoords.x} ${reqCoords.y} Q ${(reqCoords.x + dCoords.x) / 2} ${
                  (reqCoords.y + dCoords.y) / 2 - 30
                } ${dCoords.x} ${dCoords.y}`}
                fill="none"
                stroke={activeRequest.acceptedDonorIds.includes(d.id) ? '#00E5FF' : '#F59E0B'}
                strokeWidth={activeRequest.acceptedDonorIds.includes(d.id) ? '2' : '1.2'}
                strokeDasharray={activeRequest.acceptedDonorIds.includes(d.id) ? 'none' : '4 3'}
                opacity={0.85}
              />
            );
          })}

        {/* Area Density Bubbles */}
        {Object.entries(areaCounts).map(([area, info], idx) => {
          const pt = projectCoords(info.lat, info.lng, width, height);
          const radius = Math.min(32, Math.max(14, info.count * 1.3));
          return (
            <g key={idx} className="cursor-pointer group">
              <circle
                cx={pt.x}
                cy={pt.y}
                r={radius}
                fill="rgba(0, 229, 255, 0.15)"
                stroke="#00E5FF"
                strokeWidth="1"
                className="transition-all duration-300 group-hover:fill-cyan-500/30"
              />
              <circle cx={pt.x} cy={pt.y} r={3} fill="#00E5FF" />
              <text
                x={pt.x}
                y={pt.y + radius + 12}
                textAnchor="middle"
                fill="#94A3B8"
                fontSize="10"
                fontFamily="Space Grotesk, sans-serif"
                className="pointer-events-none group-hover:fill-white font-medium"
              >
                {area} ({info.count})
              </text>
            </g>
          );
        })}

        {/* Hospital Markers */}
        {hospitals.map((hosp) => {
          const pt = projectCoords(hosp.latitude, hosp.longitude, width, height);
          const isReqHosp = hosp.id === activeRequest?.hospitalId;
          return (
            <g key={hosp.id} className="cursor-pointer">
              {isReqHosp && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={18}
                  fill="rgba(220, 38, 38, 0.3)"
                  className="animate-ping"
                />
              )}
              <rect
                x={pt.x - 7}
                y={pt.y - 7}
                width={14}
                height={14}
                rx={3}
                fill={isReqHosp ? '#DC2626' : '#EF4444'}
                filter="url(#glow-red)"
              />
              <path
                d={`M ${pt.x} ${pt.y - 4} L ${pt.x} ${pt.y + 4} M ${pt.x - 4} ${pt.y} L ${pt.x + 4} ${pt.y}`}
                stroke="#FFF"
                strokeWidth="2"
              />
              <text
                x={pt.x}
                y={pt.y - 12}
                textAnchor="middle"
                fill={isReqHosp ? '#FF4D6D' : '#FCA5A5'}
                fontSize="11"
                fontWeight={isReqHosp ? 'bold' : 'normal'}
                fontFamily="Space Grotesk, sans-serif"
              >
                {hosp.name.replace('Super Speciality Hospital', '').replace('Clinic', '')}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
