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
    setTimeout(() => setSaved(false), 2000)
  }

  const logout = async () => {
    await createClient().auth.signOut()
    router.replace('/onboarding')
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-5 pt-14 pb-8 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">🏡</div>
          <div>
            <p className="font-black text-lg">{name || 'Müşteri'}</p>
            <p className="text-blue-200 text-sm">{profile?.phone}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        <div className="card p-5 space-y-4">
          <p className="font-bold text-gray-800">Profil Bilgileri</p>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Ad Soyad</label>
            <input className="input" placeholder="Adınızı girin" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Telefon</label>
            <input className="input bg-gray-50" value={profile?.phone || ''} disabled />
          </div>
          <button className="btn-primary py-3.5" onClick={save} disabled={saving}>
            {saved ? '✅ Kaydedildi!' : saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>

        <button className="btn-secondary py-4 text-red-500 border-red-100" onClick={logout}>
          🚪 Çıkış Yap
        </button>
      </div>
    </div>
  )
}
