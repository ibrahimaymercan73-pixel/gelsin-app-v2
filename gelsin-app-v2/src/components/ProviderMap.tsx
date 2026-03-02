'use client'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons
const providerIcon = L.divIcon({
  className: '',
  html: `<div style="background:#f97316;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(249,115,22,0.5);border:3px solid white;">👷</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

interface Props {
  providers: any[]
  center?: [number, number]
}

export default function ProviderMap({ providers, center = [41.015137, 28.979530] }: Props) {
  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com">CARTO</a>'
      />
      {providers.filter(p => p.current_lat && p.current_lng).map(p => (
        <Marker key={p.id} position={[p.current_lat, p.current_lng]} icon={providerIcon}>
          <Popup>
            <div className="font-semibold">{p.profiles?.full_name || 'Usta'}</div>
            <div className="text-sm text-gray-500">⭐ {p.rating || '—'}</div>
            <div className="text-xs text-gray-400 mt-1">{p.service_categories?.join(', ')}</div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
