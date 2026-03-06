'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import dynamic from 'next/dynamic'

const AdminLiveMap = dynamic(() => import('@/components/AdminLiveMap'), { ssr: false })

export default function AdminLivePage() {
  const [providers, setProviders] = useState<any[]>([])
  const [activeJobs, setActiveJobs] = useState<any[]>([])
  const [disputedJobs, setDisputedJobs] = useState<any[]>([])

  const load = async () => {
    const supabase = createClient()
    const [{ data: prov }, { data: jobs }] = await Promise.all([
      supabase.from('provider_profiles').select('*, profiles(full_name, phone)').eq('is_online', true).eq('status', 'approved'),
      supabase.from('jobs').select('*, profiles!jobs_customer_id_fkey(full_name), service_categories(name, icon)')
        .in('status', ['accepted', 'started', 'disputed']),
    ])
    setProviders(prov || [])
    const allJobs = jobs || []
    setActiveJobs(allJobs.filter((j) => j.status === 'accepted' || j.status === 'started'))
    setDisputedJobs(allJobs.filter((j) => j.status === 'disputed'))
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000) // 15 sn'de bir güncelle
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-surface-900" style={{fontFamily:'Syne,sans-serif'}}>
            Canlı Operasyon
          </h1>
          <p className="text-surface-500 mt-1">Her 15 saniyede güncellenir</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-700 font-semibold text-sm">{providers.length} Uzman Aktif</span>
          </div>
          <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-4 py-2">
            <div className="w-2.5 h-2.5 bg-brand-500 rounded-full animate-pulse" />
            <span className="text-brand-700 font-semibold text-sm">{activeJobs.length} İş Devam Ediyor</span>
          </div>
          {disputedJobs.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-amber-700 font-semibold text-sm">
                {disputedJobs.length} Uyuşmazlık
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Harita */}
      <div className="card overflow-hidden" style={{height: '500px'}}>
        <AdminLiveMap providers={providers} jobs={activeJobs} />
      </div>

      {/* Active Jobs List */}
      <div className="card p-5">
        <h2 className="font-bold text-surface-800 mb-4">Devam Eden İşler</h2>
        {activeJobs.length === 0 ? (
          <div className="text-center py-8 text-surface-400">
            <p>Şu an devam eden iş yok</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-surface-400 border-b border-surface-100">
                  <th className="text-left py-2 font-medium">İş</th>
                  <th className="text-left py-2 font-medium">Müşteri</th>
                  <th className="text-left py-2 font-medium">Adres</th>
                  <th className="text-left py-2 font-medium">Fiyat</th>
                  <th className="text-left py-2 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {activeJobs.map(job => (
                  <tr key={job.id} className="border-b border-surface-50 hover:bg-surface-50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span>{job.service_categories?.icon}</span>
                        <span className="font-medium text-surface-900 truncate max-w-xs">{job.title}</span>
                      </div>
                    </td>
                    <td className="py-3 text-surface-600">{job.profiles?.full_name}</td>
                    <td className="py-3 text-surface-400 text-xs truncate max-w-xs">{job.address}</td>
                    <td className="py-3 font-semibold text-surface-900">₺{job.agreed_price || '—'}</td>
                    <td className="py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        job.status === 'started' ? 'bg-brand-100 text-brand-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {job.status === 'started' ? '🔨 Devam Ediyor' : '✅ Kabul Edildi'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disputed Jobs List */}
      {disputedJobs.length > 0 && (
        <div className="card p-5 mt-4">
          <h2 className="font-bold text-amber-800 mb-4">Uyuşmazlık Açılan İşler</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-surface-400 border-b border-surface-100">
                  <th className="text-left py-2 font-medium">İş</th>
                  <th className="text-left py-2 font-medium">Müşteri</th>
                  <th className="text-left py-2 font-medium">Adres</th>
                  <th className="text-left py-2 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {disputedJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-surface-50 hover:bg-surface-50"
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span>{job.service_categories?.icon}</span>
                        <span className="font-medium text-surface-900 truncate max-w-xs">
                          {job.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-surface-600">
                      {job.profiles?.full_name}
                    </td>
                    <td className="py-3 text-surface-400 text-xs truncate max-w-xs">
                      {job.address}
                    </td>
                    <td className="py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        ⚠️ Uyuşmazlık
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
