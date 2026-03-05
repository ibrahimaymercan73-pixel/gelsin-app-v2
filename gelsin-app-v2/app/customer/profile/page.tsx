'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function CustomerProfile() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
      setProfile(data)
      setName(data?.full_name || '')
    }
    load()
  }, [])

  const save = async () => {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ full_name: name }).eq('id', profile.id)
    setSaved(true); setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  const logout = async () => {
    await createClient().auth.signOut()
    router.replace('/')
  }

  const initial = name?.charAt(0)?.toUpperCase() || 'M'

  return (
    <div className="min-h-screen bg-[#F4F7FA]">

      {/* HEADER */}
      <header className="px-6 lg:px-10 py-6 flex items-center justify-between sticky top-0 bg-[#F4F7FA]/80 backdrop-blur-md z-40 border-b border-slate-200/50">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Hesabım</p>
          <h1 className="text-xl font-black text-slate-800 mt-0.5">Profilim</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* SOL: Profil Kartı */}
          <div className="lg:col-span-1 space-y-4">
            {/* Avatar Kart */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-[1.5rem] flex items-center justify-center text-4xl font-black text-white mx-auto mb-4 shadow-lg shadow-blue-200">
                {initial}
              </div>
              <p className="font-black text-slate-800 text-xl">{name || 'Müşteri'}</p>
              <p className="text-slate-400 text-sm mt-1 font-medium">{profile?.phone || ''}</p>
              <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 border border-blue-100 px-4 py-2 rounded-full">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-xs font-bold text-blue-600">Müşteri Hesabı</span>
              </div>
            </div>

            {/* İstatistik Kart */}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
              <p className="font-bold text-slate-700 text-sm mb-4 uppercase tracking-wider">Hesap Bilgileri</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500">Rol</span>
                  <span className="text-sm font-bold text-slate-800">Müşteri</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500">Telefon</span>
                  <span className="text-sm font-bold text-slate-800">{profile?.phone || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">Durum</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">Aktif</span>
                </div>
              </div>
            </div>
          </div>

          {/* SAĞ: Form + Ayarlar */}
          <div className="lg:col-span-2 space-y-4">

            {/* Profil Düzenleme */}
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
                    className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 text-slate-400 text-base font-medium cursor-not-allowed"
                    value={profile?.phone || ''}
                    disabled
                  />
                  <p className="text-xs text-slate-400 mt-1.5 ml-1">Telefon numarası değiştirilemez</p>
                </div>

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

            {/* Güvenlik Kart */}
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

            {/* Çıkış */}
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
