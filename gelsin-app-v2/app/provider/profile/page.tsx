'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useProviderAuth } from '../ProviderLayoutClient'
import { SERVICE_CATEGORIES, CITIES } from '@/lib/constants'

function ProviderProfileSkeleton() {
  return (
    <div>
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-5 pt-14 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-white/30 rounded animate-pulse" />
            <div className="h-5 w-24 bg-white/20 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="px-4 py-5 space-y-4">
        <div className="card p-5 space-y-4">
          <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ProviderProfile() {
  const router = useRouter()
  const { profile: ctxProfile, providerProfile: pp, email } = useProviderAuth()
  const [name, setName] = useState(ctxProfile?.full_name ?? '')
  const [bio, setBio] = useState((pp as { bio?: string } | null)?.bio ?? '')
  const [cats, setCats] = useState<string[]>((pp as { service_categories?: string[] } | null)?.service_categories ?? [])
  const [mainCategory, setMainCategory] = useState<string | null>((pp as { main_category?: string | null } | null)?.main_category ?? null)
  const [phone, setPhone] = useState(ctxProfile?.phone ?? '')
  const [city, setCity] = useState(ctxProfile?.city ?? '')
  const [hidePhone, setHidePhone] = useState(ctxProfile?.hide_phone ?? false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (ctxProfile) {
      setName(ctxProfile.full_name ?? '')
      setPhone(ctxProfile.phone ?? '')
      setCity(ctxProfile.city ?? '')
      setHidePhone(ctxProfile.hide_phone ?? false)
    }
    if (pp) {
      const p = pp as { bio?: string; service_categories?: string[]; main_category?: string | null }
      setBio(p.bio ?? '')
      setCats(p.service_categories ?? [])
      setMainCategory(p.main_category ?? null)
    }
  }, [ctxProfile, pp])

  if (!ctxProfile) {
    return <ProviderProfileSkeleton />
  }

  const save = async () => {
    setSaveError('')
    setSaving(true)
    const supabase = createClient()
    if (phone?.trim()) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phone.trim())
        .neq('id', ctxProfile.id)
        .maybeSingle()
      if (existing) {
        setSaveError('Bu telefon numarası başka bir hesap tarafından kullanılıyor.')
        setSaving(false)
        return
      }
    }
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: name, phone: phone?.trim() || null, city: city?.trim() || null })
      .eq('id', ctxProfile.id)
    if (profileError) {
      if (profileError.code === '23505') {
        setSaveError('Bu telefon numarası başka bir hesap tarafından kullanılıyor.')
      } else {
        setSaveError(profileError.message || 'Profil güncellenemedi.')
      }
      setSaving(false)
      return
    }
    await supabase.from('provider_profiles').update({ bio }).eq('id', ctxProfile.id)
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  const mainCategoryInfo = SERVICE_CATEGORIES.find(c => c.id === mainCategory)

  const toggleHidePhone = async () => {
    const next = !hidePhone
    setHidePhone(next)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ hide_phone: next })
      .eq('id', ctxProfile.id)
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
  const ppStatus = (pp as { status?: string } | null)?.status
  const ppRating = (pp as { rating?: number } | null)?.rating
  const ppTotalReviews = (pp as { total_reviews?: number } | null)?.total_reviews

  return (
    <div>
      {!ctxProfile.city && (
        <div className="mx-4 mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
          Şehrinizi güncelleyin. İlanlarınız doğru bölgede listelenecek.
        </div>
      )}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-5 pt-14 pb-8 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">🔧</div>
          <div>
            <p className="font-black text-lg">{name || 'Uzman'}</p>
            <span className={ppStatus ? statusColors[ppStatus] : 'badge-gray'}>
              {ppStatus ? statusLabels[ppStatus] : '—'}
            </span>
            {typeof ppRating === 'number' && (
              <div className="mt-1 flex items-center gap-2 text-xs text-blue-100">
                <span className="text-yellow-300">★</span>
                <span className="font-semibold">
                  {ppRating.toFixed(1)} / 5
                </span>
                <span className="text-blue-200">
                  ({(ppTotalReviews ?? 0)} değerlendirme)
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
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Şehir</label>
            <select
              className="input"
              value={city}
              onChange={e => setCity(e.target.value)}
            >
              <option value="">Şehir seçin</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
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

          {mainCategoryInfo && (
            <div className="flex items-center gap-2 mb-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <mainCategoryInfo.icon className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900 text-sm">{mainCategoryInfo.name}</span>
            </div>
          )}

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
                className="text-sm font-semibold text-blue-600"
              >
                Hizmet kategorilerini seç →
              </Link>
            </div>
          )}
        </div>

        <div className="card p-5">
          <p className="font-bold text-gray-800 mb-4">Hesap Yönetimi</p>
          <div className="space-y-1">
            {[
              { href: '/provider/services', label: 'İlanlarım' },
              { href: '/provider/wallet', label: 'Cüzdan' },
              { href: '/provider/support', label: 'Destek' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between py-3.5 px-2 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-800">{label}</span>
                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
              </Link>
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
