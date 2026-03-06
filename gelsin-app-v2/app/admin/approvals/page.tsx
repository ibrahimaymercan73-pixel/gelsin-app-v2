'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminApprovalsPage() {
  const [providers, setProviders] = useState<any[]>([])
  const [processing, setProcessing] = useState<string | null>(null)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'suspended'>('pending')

  const load = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('provider_profiles')
      .select('*, profiles(full_name, phone, created_at)')
      .eq('status', filter)
      .order('created_at', { ascending: false })
    setProviders(data || [])
  }

  useEffect(() => { load() }, [filter])

  const approve = async (providerId: string) => {
    setProcessing(providerId)
    const supabase = createClient()

    // Belgeleri sil (KVKK uyumu)
    await supabase.storage.from('documents').remove([
      `${providerId}/id-document.pdf`,
      `${providerId}/criminal-record.pdf`,
    ])

    // Profili onayla ve belge URL'lerini temizle
    await supabase.from('provider_profiles').update({
      status: 'approved',
      id_document_url: null,
      criminal_record_url: null,
      documents_verified_at: new Date().toISOString(),
    }).eq('id', providerId)

    // Uzmana bildirim
    await supabase.from('notifications').insert({
      user_id: providerId,
      title: '🎉 Hesabınız Onaylandı!',
      body: 'Artık Gelsin.app üzerinden iş alabilirsiniz. Çevrimiçi olun ve işlere teklif verin!',
      type: 'account_approved',
    })

    setProcessing(null)
    await load()
  }

  const suspend = async (providerId: string) => {
    setProcessing(providerId)
    const supabase = createClient()
    await supabase.from('provider_profiles').update({ status: 'suspended' }).eq('id', providerId)
    setProcessing(null)
    await load()
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-surface-900" style={{fontFamily:'Syne,sans-serif'}}>
          İK Onay Masası
        </h1>
        <p className="text-surface-500 mt-1">Uzman belgelerini inceleyin ve onaylayın</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['pending', 'approved', 'suspended'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f ? 'bg-surface-900 text-white' : 'bg-white text-surface-600 border border-surface-200 hover:border-surface-400'
            }`}
          >
            {f === 'pending' ? '⏳ Bekleyenler' : f === 'approved' ? '✅ Onaylılar' : '🚫 Askıya Alınanlar'}
            {f === filter && providers.length > 0 && (
              <span className="ml-2 bg-brand-500 text-white text-xs rounded-full px-1.5">{providers.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Providers */}
      <div className="space-y-4">
        {providers.map(p => (
          <div key={p.id} className="card p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-surface-100 rounded-2xl flex items-center justify-center text-3xl">👷</div>
                <div>
                  <h3 className="font-bold text-surface-900 text-lg">
                    {p.profiles?.full_name || 'İsimsiz Uzman'}
                  </h3>
                  <p className="text-surface-500">{p.profiles?.phone}</p>
                  <p className="text-xs text-surface-400 mt-0.5">
                    Kayıt: {new Date(p.profiles?.created_at).toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' })}
                  </p>
                </div>
              </div>
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                p.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                p.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {p.status === 'pending' ? '⏳ Bekliyor' : p.status === 'approved' ? '✅ Onaylı' : '🚫 Askıda'}
              </span>
            </div>

            {p.bio && (
              <p className="text-sm text-surface-600 bg-surface-50 p-3 rounded-xl mb-4">{p.bio}</p>
            )}

            {p.service_categories?.length > 0 && (
              <div className="flex gap-2 mb-4">
                {p.service_categories.map((cat: string) => (
                  <span key={cat} className="bg-brand-50 text-brand-700 text-xs font-medium px-2.5 py-1 rounded-lg">
                    {cat === 'repair' ? '🔧 Tamir' : cat === 'cleaning' ? '🧹 Temizlik' : '🏠 Halı Yıkama'}
                  </span>
                ))}
              </div>
            )}

            {/* Belgeler */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {p.id_document_url ? (
                <a
                  href={p.id_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  <span className="text-2xl">🪪</span>
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Kimlik Belgesi</p>
                    <p className="text-xs text-blue-600">Görüntüle / İndir</p>
                  </div>
                </a>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-surface-50 border border-surface-200 rounded-xl opacity-60">
                  <span className="text-2xl">🪪</span>
                  <div>
                    <p className="text-sm font-medium text-surface-600">Kimlik Belgesi</p>
                    <p className="text-xs text-surface-400">{p.documents_verified_at ? 'Doğrulandı, silindi (KVKK)' : 'Yüklenmedi'}</p>
                  </div>
                </div>
              )}

              {p.criminal_record_url ? (
                <a
                  href={p.criminal_record_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors"
                >
                  <span className="text-2xl">📋</span>
                  <div>
                    <p className="text-sm font-semibold text-green-800">Adli Sicil Kaydı</p>
                    <p className="text-xs text-green-600">Görüntüle / İndir</p>
                  </div>
                </a>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-surface-50 border border-surface-200 rounded-xl opacity-60">
                  <span className="text-2xl">📋</span>
                  <div>
                    <p className="text-sm font-medium text-surface-600">Adli Sicil Kaydı</p>
                    <p className="text-xs text-surface-400">{p.documents_verified_at ? 'Doğrulandı, silindi (KVKK)' : 'Yüklenmedi'}</p>
                  </div>
                </div>
              )}
            </div>

            {p.documents_verified_at && (
              <p className="text-xs text-emerald-600 mb-3">
                ✅ Belgeler {new Date(p.documents_verified_at).toLocaleDateString('tr-TR')} tarihinde doğrulandı ve KVKK kapsamında silindi
              </p>
            )}

            {/* Actions */}
            {p.status === 'pending' && (
              <div className="flex gap-3">
                <button
                  onClick={() => approve(p.id)}
                  disabled={processing === p.id}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  {processing === p.id ? 'İşleniyor...' : '✅ Onayla & Belgeleri Sil'}
                </button>
                <button
                  onClick={() => suspend(p.id)}
                  disabled={processing === p.id}
                  className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl transition-all border border-red-200"
                >
                  🚫 Reddet
                </button>
              </div>
            )}
            {p.status === 'approved' && (
              <button
                onClick={() => suspend(p.id)}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-xl transition-all border border-red-200"
              >
                Hesabı Askıya Al
              </button>
            )}
            {p.status === 'suspended' && (
              <button
                onClick={() => approve(p.id)}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-sm font-medium rounded-xl transition-all border border-emerald-200"
              >
                Hesabı Aktif Et
              </button>
            )}
          </div>
        ))}

        {providers.length === 0 && (
          <div className="text-center py-16 text-surface-400">
            <div className="text-5xl mb-4">
              {filter === 'pending' ? '✅' : '📭'}
            </div>
            <p className="font-medium">
              {filter === 'pending' ? 'Onay bekleyen uzman yok' : 'Bu kategoride kayıt bulunamadı'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
