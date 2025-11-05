'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon path for Leaflet in bundlers (e.g., Next.js)
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function ClickToSet({ onPick }: { onPick: (pos: { lat: number; lng: number }) => void }) {
  // Handle map clicks and emit picked lat/lng to parent
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Imperatively re-center when `picked` changes
function RecenterOnPick({ picked }: { picked: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (picked) {
      map.setView([picked.lat, picked.lng], 12);
    }
  }, [picked, map]);
  return null;
}

type LeafletMapProps = {
  /** Currently picked lat/lng; shows marker + radius circle when present */
  picked: { lat: number; lng: number } | null;
  /** Callback invoked when user clicks on the map */
  onPick: (pos: { lat: number; lng: number }) => void;
  /** Radius in meters for the search circle (default ~1 mile) */
  radiusMeters?: number;
};

/**
 * LeafletMap
 *
 * Interactive map for selecting a location by clicking. Displays a marker and a
 * circular radius around the picked point, and re-centers when selection changes.
 *
 * @example
 * <LeafletMap picked={picked} onPick={setPicked} radiusMeters={1609} />
 */
export default function LeafletMap({
  picked,
  onPick,
  radiusMeters = 1609, // default 1 mile
}: LeafletMapProps) {
  // Initial viewport (continental US)
  const initialCenter: [number, number] = [40.0, -95.0];
  const initialZoom = 4;

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      style={{ height: 420, width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickToSet onPick={onPick} />
      <RecenterOnPick picked={picked} />

      {picked && (
        <>
          <Marker position={[picked.lat, picked.lng]} />
          <Circle
            center={[picked.lat, picked.lng]}
            radius={radiusMeters}
            pathOptions={{ color: '#2563eb', fillOpacity: 0.08 }}
          />
        </>
      )}
    </MapContainer>
  );
}
