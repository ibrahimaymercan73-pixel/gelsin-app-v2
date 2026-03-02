'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function CustomerJobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [tab, setTab] = useState<'active' | 'past'>('active')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('jobs')
        .select('*, service_categories(name, icon)')
        .eq('customer_id', user!.id)
        .order('created_at', { ascending: false })
      setJobs(data || [])
    }
    load()
  }, [])

  const active = jobs.filter(j => ['open','offered','accepted','started'].includes(j.status))
  const past = jobs.filter(j => ['completed','cancelled'].includes(j.status))
  const list = tab === 'active' ? active : past

  const statusMap: Record<string, { label: string; cls: string }> = {
    open: { label: '📢 Teklif Bekleniyor', cls: 'badge-blue' },
    offered: { label: '💬 Teklif Var', cls: 'badge-orange' },
    accepted: { label: '🚗 Usta Yolda', cls: 'badge-green' },
    started: { label: '🔨 Devam Ediyor', cls: 'badge-orange' },
    completed: { label: '✅ Tamamlandı', cls: 'badge-green' },
    cancelled: { label: '❌ İptal', cls: 'badge-gray' },
  }

  return (
    <div>
      <div className="bg-white px-5 pt-14 pb-0 border-b border-gray-100">
        <h1 className="text-2xl font-black text-gray-900 mb-4">İşlerim</h1>
        <div className="flex">
          {(['active', 'past'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'
              }`}>
              {t === 'active' ? `Aktif (${active.length})` : `Geçmiş (${past.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-2">
        {list.map(job => (
          <Link key={job.id} href={`/customer/jobs/${job.id}`}>
            <div className="card p-4 flex items-center gap-3 active:scale-99 transition-transform">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                {job.service_categories?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{job.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={statusMap[job.status]?.cls}>{statusMap[job.status]?.label}</span>
                </div>
                {job.agreed_price && (
                  <p className="text-xs text-gray-400 mt-0.5">₺{job.agreed_price}</p>
                )}
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </div>
          </Link>
        ))}
        {list.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="text-5xl mb-4">{tab === 'active' ? '📭' : '📂'}</div>
            <p className="font-bold text-gray-600">{tab === 'active' ? 'Aktif iş yok' : 'Geçmiş iş yok'}</p>
            {tab === 'active' && (
              <Link href="/customer/new-job" className="btn-primary mt-4 px-8 py-3 w-auto inline-block">
                Yeni İş Aç
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
