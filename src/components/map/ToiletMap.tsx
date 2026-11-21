import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Toilet } from '../../types';
import { Link } from 'react-router-dom';

interface ToiletMapProps {
  toilets: Toilet[];
  selectedToiletId?: string;
  onSelectToilet?: (toilet: Toilet) => void;
  userLocation?: { lat: number; lng: number };
  height?: string;
}

export const ToiletMap: React.FC<ToiletMapProps> = ({
  toilets,
  selectedToiletId,
  onSelectToilet,
  userLocation = { lat: 18.5204, lng: 73.8567 },
  height = '500px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Leaflet Map centered on Pune
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLocation.lat, userLocation.lng],
        zoom: 14,
        zoomControl: true,
      });

      // OpenStreetMap Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | SaniTrack Pune',
        maxZoom: 19,
      }).addTo(map);

      // User location marker
      const userIcon = L.divIcon({
        className: 'user-pulse-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-md"></span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup('<strong>Your Location</strong><br/>Pune Pilot Area');

      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup if container unmounts
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    toilets.forEach((toilet) => {
      const isSelected = toilet.id === selectedToiletId;

      // Color by status
      let markerColor = 'bg-emerald-600';
      let borderColor = 'border-emerald-200';
      let pulseAnim = '';

      if (toilet.currentStatus === 'under_maintenance') {
        markerColor = 'bg-orange-500';
        borderColor = 'border-orange-200';
      } else if (toilet.currentStatus === 'closed') {
        markerColor = 'bg-rose-600';
        borderColor = 'border-rose-200';
      } else if (toilet.currentStatus === 'open') {
        markerColor = 'bg-emerald-600';
        borderColor = 'border-emerald-300';
        if (toilet.nightRatingScore && toilet.nightRatingScore > 90) {
          pulseAnim = 'ring-2 ring-emerald-400 ring-offset-1';
        }
      }

      // Check sanitary dispenser icon badge
      const hasPadDispenser = toilet.sanitaryFacilities?.some(
        (sf) => sf.facilityType === 'pad_dispenser' && sf.availability
      );

      const customIcon = L.divIcon({
        className: 'custom-toilet-marker',
        html: `
          <div class="cursor-pointer group flex flex-col items-center">
            <div class="${markerColor} text-white font-bold text-xs p-1.5 rounded-full shadow-lg border-2 ${borderColor} ${pulseAnim} transform transition-transform group-hover:scale-125 flex items-center justify-center relative">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 12h10M12 7v10"/>
              </svg>
              ${
                hasPadDispenser
                  ? `<span class="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full border border-white" title="Pad Dispenser Available"></span>`
                  : ''
              }
            </div>
            <div class="bg-slate-900/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded shadow mt-1 whitespace-nowrap max-w-[120px] truncate hidden md:block">
              ${toilet.name.split(' ')[0]}
            </div>
          </div>
        `,
        iconSize: [40, 48],
        iconAnchor: [20, 24],
        popupAnchor: [0, -20],
      });

      const marker = L.marker([toilet.latitude, toilet.longitude], {
        icon: customIcon,
      }).addTo(map);

      // Popup Content
      const popupHtml = `
        <div class="p-1 text-slate-800" style="min-width: 220px;">
          <div class="flex items-center justify-between gap-1 mb-1">
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">${toilet.locality}</span>
            <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              toilet.currentStatus === 'open'
                ? 'bg-emerald-100 text-emerald-800'
                : toilet.currentStatus === 'under_maintenance'
                ? 'bg-orange-100 text-orange-800'
                : 'bg-rose-100 text-rose-800'
            }">${toilet.currentStatus.toUpperCase()}</span>
          </div>
          <h4 class="font-bold text-sm text-slate-900 leading-tight mb-1">${toilet.name}</h4>
          <p class="text-xs text-slate-600 mb-2">${toilet.address}</p>
          
          <div class="flex flex-wrap gap-1 text-[10px] text-slate-600 mb-2">
            ${
              hasPadDispenser
                ? '<span class="px-1.5 py-0.5 bg-pink-50 text-pink-700 rounded font-semibold border border-pink-200">✨ Pad Dispenser</span>'
                : ''
            }
            ${
              toilet.facilities.wheelchairRamp
                ? '<span class="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200">♿ Accessible</span>'
                : ''
            }
            <span class="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold">${
              toilet.entryFee === 0 ? 'Free Entry' : `₹${toilet.entryFee} Entry`
            }</span>
          </div>

          <div class="text-[10px] text-slate-500 mb-3 italic">
            🕒 ${toilet.statusFreshness}
          </div>

          <a href="/toilets/${toilet.id}" class="block text-center w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition-colors" style="text-decoration: none;">
            View Full Facility Profile &rarr;
          </a>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        if (onSelectToilet) {
          onSelectToilet(toilet);
        }
      });

      markersRef.current[toilet.id] = marker;
    });

    // If selected toilet changed, pan to it
    if (selectedToiletId && markersRef.current[selectedToiletId]) {
      const selected = toilets.find((t) => t.id === selectedToiletId);
      if (selected) {
        map.panTo([selected.latitude, selected.longitude], { animate: true });
        markersRef.current[selectedToiletId].openPopup();
      }
    }
  }, [toilets, selectedToiletId, onSelectToilet]);

  return (
    <div
      ref={mapContainerRef}
      style={{ height }}
      className="w-full h-full relative z-10"
    />
  );
};
