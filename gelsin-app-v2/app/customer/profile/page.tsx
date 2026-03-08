'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useCustomerAuth } from '../CustomerLayoutClient'
import { CITIES } from '@/lib/constants'
import { LifeBuoy } from 'lucide-react'

function CustomerProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <header className="px-6 lg:px-10 py-6 border-b border-slate-200/50">
        <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
        <div className="h-7 w-24 mt-2 bg-slate-200 rounded animate-pulse" />
      </header>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
              <div className="w-24 h-24 bg-slate-200 rounded-[1.5rem] mx-auto mb-4 animate-pulse" />
              <div className="h-6 w-32 bg-slate-200 rounded animate-pulse mx-auto" />
              <div className="h-4 w-48 bg-slate-100 rounded animate-pulse mt-2 mx-auto" />
              <div className="h-4 w-24 bg-slate-100 rounded animate-pulse mt-2 mx-auto" />
            </div>
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-3">
              <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
              <div className="h-6 w-36 bg-slate-200 rounded animate-pulse mb-6" />
              <div className="space-y-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CustomerProfile() {
  const router = useRouter()
  const { profile: ctxProfile, email } = useCustomerAuth()
  const [name, setName] = useState(ctxProfile?.full_name ?? '')
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
  }, [ctxProfile])

  if (!ctxProfile) {
    return <CustomerProfileSkeleton />
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
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name, phone: phone?.trim() || null, city: city?.trim() || null })
      .eq('id', ctxProfile.id)
    if (error) {
      if (error.code === '23505') {
        setSaveError('Bu telefon numarası başka bir hesap tarafından kullanılıyor.')
      } else {
        setSaveError(error.message || 'Profil güncellenemedi.')
      }
      setSaving(false)
      return
    }
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  const toggleHidePhone = async () => {
    const next = !hidePhone
    setHidePhone(next)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ hide_phone: next })
      .eq('id', ctxProfile.id)
  }

  const logout = async () => {
    await createClient().auth.signOut()
    router.replace('/')
  }

  const initial = name?.charAt(0)?.toUpperCase() || 'M'

  return (
    <div className="min-h-screen bg-[#F4F7FA]">

      <header className="px-6 lg:px-10 py-6 flex items-center justify-between sticky top-0 bg-[#F4F7FA]/80 backdrop-blur-md z-40 border-b border-slate-200/50">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Hesabım</p>
          <h1 className="text-xl font-black text-slate-800 mt-0.5">Profilim</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
        {!ctxProfile.city && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
            Şehrinizi güncelleyin. Böylece size uygun ilanlar ve uzmanlar listelenecek.
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-[1.5rem] flex items-center justify-center text-4xl font-black text-white mx-auto mb-4 shadow-lg shadow-blue-200">
                {initial}
              </div>
              <p className="font-black text-slate-800 text-xl">{name || 'Müşteri'}</p>
              {email && <p className="text-slate-500 text-sm mt-1 font-medium">{email}</p>}
              <p className="text-slate-400 text-sm mt-0.5 font-medium">{phone || ''}</p>
              <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 border border-blue-100 px-4 py-2 rounded-full">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-xs font-bold text-blue-600">Müşteri Hesabı</span>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
              <p className="font-bold text-slate-700 text-sm mb-4 uppercase tracking-wider">Hesap Bilgileri</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500">E-posta (giriş)</span>
                  <span className="text-sm font-bold text-slate-800 truncate max-w-[180px]" title={email || ''}>{email || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500">Rol</span>
                  <span className="text-sm font-bold text-slate-800">Müşteri</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500">Telefon</span>
                  <span className="text-sm font-bold text-slate-800">{phone || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">Durum</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">Aktif</span>
                </div>
              </div>
            </div>

            <Link
              href="/customer/support"
              className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800 text-sm">Destek Merkezi</p>
                <p className="text-xs text-slate-500">Talep oluştur, yardım al</p>
              </div>
            </Link>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center">✏️</div>
                <div>
                  <p className="font-black text-slate-800">Profil Bilgileri</p>
                  <p className="text-xs text-slate-400">Bilgilerinizi güncelleyin</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Ad Soyad</label>
                  <input
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white text-slate-900 placeholder-slate-300 text-base font-medium"
                    placeholder="Adınızı girin"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Telefon</label>
                  <input
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white text-slate-900 text-base font-medium placeholder-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
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
                      Karşı taraf, gizliyken numaranızı göremez.
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Şehir</label>
                  <select
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white text-slate-900 text-base font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  >
                    <option value="">Şehir seçin</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {saveError && (
                  <p className="text-red-600 text-sm font-medium bg-red-50 p-4 rounded-xl border border-red-100">
                    {saveError}
                  </p>
                )}
                <button
                  onClick={save}
                  disabled={saving}
                  className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
                    saved
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-200 hover:-translate-y-0.5'
                  }`}
                >
                  {saved ? '✅ Kaydedildi!' : saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center">🔒</div>
                <div>
                  <p className="font-black text-slate-800">Güvenlik</p>
                  <p className="text-xs text-slate-400">Hesap güvenlik seçenekleri</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📱</span>
                    <div>
                      <p className="text-sm font-bold text-slate-700">SMS Doğrulama</p>
                      <p className="text-xs text-slate-400">Telefon ile kimlik doğrulandı</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Aktif</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-6 border border-red-100 shadow-sm">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-red-100 text-red-500 font-bold hover:bg-red-50 transition-all text-base"
              >
                🚪 Hesaptan Çıkış Yap
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
