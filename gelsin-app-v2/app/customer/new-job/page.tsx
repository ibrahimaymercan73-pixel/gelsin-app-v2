'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const categories = [
  { slug: 'repair', name: 'Acil Tamir', icon: '🔧', desc: 'Su tesisatı, elektrik, mobilya...' },
  { slug: 'cleaning', name: 'Temizlik', icon: '🧹', desc: 'Ev, ofis, işyeri temizliği' },
  { slug: 'carpet', name: 'Halı Yıkama', icon: '🏠', desc: 'Halı, kilim, koltuk yıkama' },
]

function NewJobForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultCat = searchParams.get('cat') || ''

  const [step, setStep] = useState(defaultCat ? 1 : 0)
  const [cat, setCat] = useState(defaultCat)
  const [catId, setCatId] = useState('')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [address, setAddress] = useState('')
  const [jobType, setJobType] = useState<'urgent' | 'scheduled'>('urgent')
  const [lat, setLat] = useState(41.0082)
  const [lng, setLng] = useState(28.9784)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(p => {
      setLat(p.coords.latitude)
      setLng(p.coords.longitude)
    })
  }, [])

  const selectCat = async (slug: string) => {
    setCat(slug)
    const supabase = createClient()
    const { data } = await supabase.from('service_categories').select('id').eq('slug', slug).single()
    setCatId(data?.id || '')
    setStep(1)
  }

  const submit = async () => {
    if (!title || !address) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const qrToken = crypto.randomUUID()
    const { data: job } = await supabase.from('jobs').insert({
      customer_id: user!.id,
      category_id: catId,
      title, description: desc, address,
      lat, lng, job_type: jobType,
      qr_token: qrToken, status: 'open'
    }).select().single()
    router.replace(`/customer/jobs/${job.id}`)
  }

  const selectedCat = categories.find(c => c.slug === cat)

  return (
    <div className="min-h-dvh bg-white max-w-7xl mx-auto">
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-5 pt-14 pb-6 text-white">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : router.back()}
          className="text-blue-300 text-sm mb-4 flex items-center gap-1">← Geri</button>
        <h1 className="text-2xl font-black">
          {step === 0 ? 'Kategori Seç' : 'İş Detayları'}
        </h1>
        <div className="flex gap-2 mt-3">
          {[0, 1].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      <div className="px-5 py-6 space-y-4">
        {step === 0 && (
          <div className="space-y-3 animate-slide-up">
            {categories.map(c => (
              <button key={c.slug} onClick={() => selectCat(c.slug)}
                className="w-full card p-4 flex items-center gap-4 text-left active:scale-98 transition-transform">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
                  {c.icon}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{c.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{c.desc}</p>
                </div>
                <span className="text-gray-300 ml-auto text-xl">›</span>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex items-center gap-3 bg-blue-50 p-3.5 rounded-2xl">
              <span className="text-2xl">{selectedCat?.icon}</span>
              <p className="font-semibold text-blue-900">{selectedCat?.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(['urgent', 'scheduled'] as const).map(t => (
                <button key={t} onClick={() => setJobType(t)}
                  className={`p-4 rounded-2xl border-2 text-center transition-all ${
                    jobType === t ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
                  }`}>
                  <div className="text-2xl mb-1">{t === 'urgent' ? '⚡' : '📅'}</div>
                  <p className="font-bold text-sm text-gray-900">{t === 'urgent' ? 'Acil' : 'Randevulu'}</p>
                </button>
              ))}
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 mb-1.5 block">İş Başlığı *</label>
              <input className="input" placeholder="ör: Mutfak musluğu damlatıyor"
                value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 mb-1.5 block">Açıklama</label>
              <textarea className="input resize-none" rows={3}
                placeholder="Sorunu kısaca açıklayın..."
                value={desc} onChange={e => setDesc(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 mb-1.5 block">Adres *</label>
              <input className="input" placeholder="Mahalle, sokak, bina no..."
                value={address} onChange={e => setAddress(e.target.value)} />
            </div>

            <button className="btn-primary" onClick={submit}
              disabled={loading || !title || !address}>
              {loading ? 'Yayınlanıyor...' : '🚀 İşi Yayınla'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function NewJobPage() {
  return <Suspense><NewJobForm /></Suspense>
}
