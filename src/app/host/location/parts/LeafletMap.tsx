'use client'

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { useEffect, useState } from 'react'
import L from 'leaflet'

// Fix default marker icon path for Leaflet in bundlers
import 'leaflet/dist/leaflet.css'
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

function ClickToSet({ onPick }: { onPick: (pos: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

export default function LeafletMap({
  picked,
  onPick,
}: {
  picked: { lat: number; lng: number } | null
  onPick: (pos: { lat: number; lng: number }) => void
}) {
  const [center, setCenter] = useState<[number, number]>([40.0, -95.0]) // USA-ish
  useEffect(() => {
    if (picked) setCenter([picked.lat, picked.lng])
  }, [picked])

  return (
    <MapContainer
      center={center}
      zoom={picked ? 12 : 4}
      style={{ height: 420, width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickToSet onPick={onPick} />
      {picked && <Marker position={[picked.lat, picked.lng]} />}
    </MapContainer>
  )
}