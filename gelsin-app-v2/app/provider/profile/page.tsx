'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { SERVICE_CATEGORIES } from '@/lib/constants'

export default function ProviderProfile() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [pp, setPp] = useState<any>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [cats, setCats] = useState<string[]>([])
  const [mainCategory, setMainCategory] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [hidePhone, setHidePhone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [uploading, setUploading] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) setEmail(user.email)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
      const { data: pData } = await supabase.from('provider_profiles').select('*').eq('id', user!.id).single()
      setProfile(p); setPp(pData)
      setName(p?.full_name || '')
      setBio(pData?.bio || '')
      setCats(pData?.service_categories || [])
      setMainCategory(pData?.main_category || null)
      setPhone(p?.phone || '')
      setHidePhone(!!p?.hide_phone)
    }
    load()
  }, [])

  const save = async () => {
    setSaveError('')
    setSaving(true)
    const supabase = createClient()
    if (phone?.trim()) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phone.trim())
        .neq('id', profile.id)
        .maybeSingle()
      if (existing) {
        setSaveError('Bu telefon numarası başka bir hesap tarafından kullanılıyor.')
        setSaving(false)
        return
      }
    }
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: name, phone: phone?.trim() || null })
      .eq('id', profile.id)
    if (profileError) {
      if (profileError.code === '23505') {
        setSaveError('Bu telefon numarası başka bir hesap tarafından kullanılıyor.')
      } else {
        setSaveError(profileError.message || 'Profil güncellenemedi.')
      }
      setSaving(false)
      return
    }
    await supabase.from('provider_profiles').update({ bio }).eq('id', profile.id)
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  // Ana kategori bilgisini bul
  const mainCategoryInfo = SERVICE_CATEGORIES.find(c => c.id === mainCategory)

  const toggleHidePhone = async () => {
    if (!profile) return
    const next = !hidePhone
    setHidePhone(next)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ hide_phone: next })
      .eq('id', profile.id)
  }

  const uploadDoc = async (type: 'id_document_url' | 'criminal_record_url', file: File) => {
    setUploading(type)
    const supabase = createClient()
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('bucket', 'documents')
      form.append('subpath', type)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Yükleme başarısız')
      await supabase.from('provider_profiles').update({ [type]: data.publicUrl }).eq('id', profile.id)
      alert('Belge yüklendi!')
    } catch (e: any) {
      alert(e?.message || 'Belge yüklenemedi')
    } finally {
      setUploading('')
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'badge-orange',
    approved: 'badge-green',
    suspended: 'badge-red',
  }
  const statusLabels: Record<string, string> = {
    pending: '⏳ Onay Bekliyor',
    approved: '✅ Onaylı',
    suspended: '🚫 Askıya Alındı',
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-5 pt-14 pb-8 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">🔧</div>
          <div>
            <p className="font-black text-lg">{name || 'Uzman'}</p>
            <span className={pp?.status ? statusColors[pp.status] : 'badge-gray'}>
              {pp?.status ? statusLabels[pp.status] : '—'}
            </span>
            {typeof pp?.rating === 'number' && (
              <div className="mt-1 flex items-center gap-2 text-xs text-blue-100">
                <span className="text-yellow-300">★</span>
                <span className="font-semibold">
                  {pp.rating.toFixed(1)} / 5
                </span>
                <span className="text-blue-200">
                  ({pp.total_reviews ?? 0} değerlendirme)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        <div className="card p-5 space-y-4">
          <p className="font-bold text-gray-800">Profil Bilgileri</p>
          {email && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">E-posta (giriş / kayıt)</label>
              <p className="text-sm font-medium text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">{email}</p>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Ad Soyad</label>
            <input className="input" placeholder="Adınızı girin" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Telefon</label>
            <input
              className="input"
              placeholder="05xx xxx xx xx"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleHidePhone}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    hidePhone ? 'bg-slate-900' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      hidePhone ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-xs font-medium text-slate-600">
                  Telefon Numaramı Gizle
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Sadece kabul edilen işlerde numaranız görünür.
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Hakkında</label>
            <textarea className="input resize-none" rows={3} placeholder="Kendinizi tanıtın..."
              value={bio} onChange={e => setBio(e.target.value)} />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-gray-800">Uzmanlık Alanları</p>
            <Link 
              href="/provider/onboarding"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              ✏️ Düzenle
            </Link>
          </div>
          
          {/* Ana Kategori */}
          {mainCategoryInfo && (
            <div className="flex items-center gap-2 mb-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <mainCategoryInfo.icon className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900 text-sm">{mainCategoryInfo.name}</span>
            </div>
          )}
          
          {/* Alt Hizmetler - Dinamik Chips */}
          {cats.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {cats.map((service, idx) => (
                <span
                  key={idx}
                  className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium border border-blue-100"
                >
                  {service}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-2">Henüz uzmanlık alanı seçilmedi</p>
              <Link 
                href="/provider/onboarding"
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                Uzmanlık alanlarını seç →
              </Link>
            </div>
          )}
        </div>

        <div className="card p-5">
          <p className="font-bold text-gray-800 mb-1">Kimlik Belgeleri</p>
          <p className="text-xs text-gray-400 mb-4">Hesabınızın onaylanması için gereklidir</p>
          <div className="space-y-3">
            {[
              { key: 'id_document_url', label: 'e-Devlet Kimlik Belgesi', icon: '🪪' },
              { key: 'criminal_record_url', label: 'Adli Sicil Kaydı', icon: '📄' },
            ].map(doc => (
              <div key={doc.key} className="flex items-center justify-between bg-gray-50 p-3.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{doc.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{doc.label}</p>
                    <p className="text-xs text-gray-400">{pp?.[doc.key] ? '✅ Yüklendi' : 'Henüz yüklenmedi'}</p>
                  </div>
                </div>
                <label className={`text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
                  uploading === doc.key ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white'
                }`}>
                  {uploading === doc.key ? '...' : 'Yükle'}
                  <input type="file" className="hidden" accept="image/*,.pdf"
                    onChange={e => e.target.files?.[0] && uploadDoc(doc.key as any, e.target.files[0])} />
                </label>
              </div>
            ))}
          </div>
        </div>

        {saveError && (
          <p className="text-red-600 text-sm font-medium bg-red-50 p-4 rounded-xl border border-red-100">
            {saveError}
          </p>
        )}
        <button className="btn-primary py-4" onClick={save} disabled={saving}>
          {saved ? '✅ Kaydedildi!' : saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>

        <button
          className="btn-secondary py-4 text-red-500 border-red-100"
          onClick={async () => {
            await createClient().auth.signOut()
            router.replace('/')
          }}
        >
          🚪 Çıkış Yap
        </button>
      </div>
    </div>
  )
}
