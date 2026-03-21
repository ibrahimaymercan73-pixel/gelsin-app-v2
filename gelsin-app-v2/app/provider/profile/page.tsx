'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight,
  Star,
  ShieldCheck,
  Clock,
  Ban,
  LogOut,
  Mail,
  User,
  Phone,
  MapPin,
  FileText,
  Briefcase,
  Settings2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useProviderAuth } from '../ProviderLayoutClient'
import { SERVICE_CATEGORIES, CITIES } from '@/lib/constants'

function ProviderProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-8 pb-28 animate-pulse">
      <div className="h-4 w-24 bg-slate-200 rounded-full mb-2" />
      <div className="h-8 w-48 bg-slate-200 rounded-lg mb-8" />
      <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6 mb-6">
        <div className="flex gap-4">
          <div className="h-20 w-20 rounded-2xl bg-slate-100" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-40 bg-slate-100 rounded-lg" />
            <div className="h-8 w-28 bg-slate-100 rounded-full" />
            <div className="h-4 w-full max-w-xs bg-slate-100 rounded" />
          </div>
        </div>
      </div>
      <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="h-4 w-32 bg-slate-100 rounded" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-slate-50 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 shadow-sm transition-all focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-900/[0.06]'

export default function ProviderProfile() {
  const router = useRouter()
  const { profile: ctxProfile, providerProfile: pp, email } = useProviderAuth()
  const [name, setName] = useState(ctxProfile?.full_name ?? '')
  const [bio, setBio] = useState((pp as { bio?: string } | null)?.bio ?? '')
  const [cats, setCats] = useState<string[]>((pp as { service_categories?: string[] } | null)?.service_categories ?? [])
  const [mainCategory, setMainCategory] = useState<string | null>(
    (pp as { main_category?: string | null } | null)?.main_category ?? null
  )
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

  const initials = useMemo(() => {
    const n = (name || 'U').trim()
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return n.slice(0, 2).toUpperCase()
  }, [name])

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

  const mainCategoryInfo = SERVICE_CATEGORIES.find((c) => c.id === mainCategory)

  const toggleHidePhone = async () => {
    const next = !hidePhone
    setHidePhone(next)
    const supabase = createClient()
    await supabase.from('profiles').update({ hide_phone: next }).eq('id', ctxProfile.id)
  }

  const statusMeta: Record<
    string,
    { label: string; Icon: typeof ShieldCheck; className: string }
  > = {
    pending: {
      label: 'Onay bekliyor',
      Icon: Clock,
      className: 'bg-amber-50 text-amber-800 ring-amber-200/80 border-amber-100',
    },
    approved: {
      label: 'Onaylı uzman',
      Icon: ShieldCheck,
      className: 'bg-emerald-50 text-emerald-800 ring-emerald-200/70 border-emerald-100',
    },
    suspended: {
      label: 'Askıya alındı',
      Icon: Ban,
      className: 'bg-red-50 text-red-800 ring-red-200/70 border-red-100',
    },
  }

  const ppStatus = (pp as { status?: string } | null)?.status
  const faceVerified = ctxProfile?.face_verified
  const displayStatus = faceVerified && ppStatus === 'pending' ? 'approved' : ppStatus
  const statusKey = displayStatus && statusMeta[displayStatus] ? displayStatus : faceVerified ? 'approved' : null
  const status = statusKey ? statusMeta[statusKey] : null

  const ppRating = (pp as { rating?: number } | null)?.rating
  const ppTotalReviews = (pp as { total_reviews?: number } | null)?.total_reviews

  const cardWrap = 'rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-7 shadow-[0_1px_3px_rgba(15,23,42,0.06)]'

  return (
    <div className="min-h-screen font-sans text-slate-900">
      <div className="max-w-2xl mx-auto px-5 sm:px-6 py-8 sm:py-10 pb-32">
        {!ctxProfile.city && (
          <div className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3.5 text-sm text-amber-900 leading-relaxed">
            Şehrinizi güncelleyin; ilanlarınız doğru bölgede listelenir.
          </div>
        )}

        {/* Başlık — kaba mavi blok yok */}
        <header className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Hesap</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 mt-1">Profil</h1>
          <p className="text-slate-500 text-sm mt-2 max-w-md leading-relaxed">
            Bilgilerinizi güncel tutun; müşteriler size daha güvenle ulaşsın.
          </p>
        </header>

        {/* Özet kartı: avatar, rozet, yıldızlar */}
        <section className={`${cardWrap} mb-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-1 ring-slate-200/80 shadow-md">
              {ctxProfile.avatar_url ? (
                <Image
                  src={ctxProfile.avatar_url}
                  alt=""
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-xl font-semibold text-white">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-slate-900 truncate">{name || 'Uzman'}</h2>
              {email && (
                <p className="text-sm text-slate-500 truncate mt-0.5">{email}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {status && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ring-1 ${status.className}`}
                  >
                    <status.Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                    {status.label}
                  </span>
                )}
                {!status && !faceVerified && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                    Doğrulama bekleniyor
                  </span>
                )}
              </div>
              {typeof ppRating === 'number' && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-0.5" aria-label={`Puan ${ppRating} üzerinden 5`}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i <= Math.round(ppRating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-slate-100 text-slate-200'
                        }`}
                        strokeWidth={i <= Math.round(ppRating) ? 0 : 1.5}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-slate-600 tabular-nums">
                    <span className="font-semibold text-slate-900">{ppRating.toFixed(1)}</span>
                    <span className="text-slate-400 mx-1">·</span>
                    {(ppTotalReviews ?? 0)} değerlendirme
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Profil bilgileri kartı */}
        <section className={`${cardWrap} mb-5 space-y-5`}>
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <User className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
            <h3 className="text-base font-semibold text-slate-900">Profil bilgileri</h3>
          </div>

          {email && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-2">
                <Mail className="h-3.5 w-3.5" strokeWidth={2} />
                E-posta
              </label>
              <p className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                {email}
              </p>
              <p className="text-[11px] text-slate-400 mt-1.5">Giriş için kullanılan adres; buradan değiştirilemez.</p>
            </div>
          )}

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-2">
              <User className="h-3.5 w-3.5" strokeWidth={2} />
              Ad soyad
            </label>
            <input className={inputClass} placeholder="Adınız ve soyadınız" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-2">
              <Phone className="h-3.5 w-3.5" strokeWidth={2} />
              Telefon
            </label>
            <input
              className={inputClass}
              placeholder="05xx xxx xx xx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleHidePhone}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    hidePhone ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                  aria-pressed={hidePhone}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      hidePhone ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-slate-600">Numaramı gizle</span>
              </div>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Sadece kabul ettiğiniz işlerde numaranız görünür.
              </p>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-2">
              <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
              Şehir
            </label>
            <select className={inputClass} value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">Şehir seçin</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
              </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-2">
              <FileText className="h-3.5 w-3.5" strokeWidth={2} />
              Hakkında
            </label>
            <textarea
              className={`${inputClass} resize-none min-h-[100px]`}
              rows={4}
              placeholder="Kendinizi kısaca tanıtın…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
        </section>

        {/* Uzmanlık kartı */}
        <section className={`${cardWrap} mb-5`}>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <Briefcase className="h-5 w-5 text-slate-400 shrink-0" strokeWidth={1.75} />
              <h3 className="text-base font-semibold text-slate-900 truncate">Uzmanlık alanları</h3>
            </div>
            <Link
              href="/choose-role"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 shrink-0"
            >
              Düzenle
            </Link>
          </div>

          {mainCategoryInfo && (
            <div className="flex items-center gap-3 mb-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <mainCategoryInfo.icon className="h-5 w-5 text-slate-700 shrink-0" />
              <span className="font-medium text-slate-800 text-sm">{mainCategoryInfo.name}</span>
            </div>
          )}

          {cats.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {cats.map((service, idx) => (
                <span
                  key={idx}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm"
                >
                  {service}
                </span>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
              <p className="text-sm text-slate-500 mb-3">Henüz uzmanlık alanı seçilmedi</p>
              <Link href="/choose-role" className="text-sm font-semibold text-slate-900 underline underline-offset-4">
                Kategorileri seç
              </Link>
            </div>
          )}
        </section>

        {/* Hesap yönetimi */}
        <section className={`${cardWrap} mb-8`}>
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-1">
            <Settings2 className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
            <h3 className="text-base font-semibold text-slate-900">Hesap</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { href: '/provider/services', label: 'İlanlarım' },
              { href: '/provider/wallet', label: 'Cüzdan' },
              { href: '/provider/support', label: 'Destek' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between py-4 first:pt-2 group"
              >
                <span className="text-[15px] font-medium text-slate-800 group-hover:text-slate-950">{label}</span>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-400 transition-colors" />
              </Link>
            ))}
          </div>
        </section>

        {saveError && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm text-red-800">
            {saveError}
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full rounded-xl bg-slate-900 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none"
          >
            {saved ? 'Kaydedildi' : saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
          </button>

          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-transparent py-3.5 text-[15px] font-medium text-slate-500 transition-colors hover:bg-slate-100/80 hover:text-slate-700"
            onClick={async () => {
              await createClient().auth.signOut()
              router.replace('/')
            }}
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            Çıkış yap
          </button>
        </div>
      </div>
    </div>
  )
}
