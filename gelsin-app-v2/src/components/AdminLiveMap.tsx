'use client'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const providerIcon = L.divIcon({
  className: '',
  html: `<div style="background:#10b981;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(16,185,129,0.5);border:3px solid white;">👷</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

const jobIcon = L.divIcon({
  className: '',
  html: `<div style="background:#f97316;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(249,115,22,0.5);border:3px solid white;">🏠</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

interface Props {
  providers: any[]
  jobs: any[]
}

export default function AdminLiveMap({ providers, jobs }: Props) {
  return (
    <MapContainer
      center={[41.015137, 28.979530]}
      zoom={12}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap &copy; CARTO'
      />

      {/* Online Ustalar */}
      {providers.filter(p => p.current_lat && p.current_lng).map(p => (
        <Marker key={`prov-${p.id}`} position={[p.current_lat, p.current_lng]} icon={providerIcon}>
          <Popup>
            <div className="font-semibold">👷 {p.profiles?.full_name || 'Usta'}</div>
            <div className="text-xs text-green-600 font-medium">✅ Çevrimiçi</div>
            <div className="text-xs text-gray-500 mt-1">{p.profiles?.phone}</div>
          </Popup>
        </Marker>
      ))}

      {/* Devam Eden İşler */}
      {jobs.filter(j => j.lat && j.lng).map(j => (
        <Marker key={`job-${j.id}`} position={[j.lat, j.lng]} icon={jobIcon}>
          <Popup>
            <div className="font-semibold">{j.title}</div>
            <div className="text-xs text-orange-600 font-medium">
              {j.status === 'started' ? '🔨 Devam Ediyor' : '✅ Kabul Edildi'}
            </div>
            <div className="text-xs text-gray-500 mt-1">₺{j.agreed_price}</div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
