'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const skills = [
  { slug: 'repair', name: 'Tamir', icon: '🔧' },
  { slug: 'cleaning', name: 'Temizlik', icon: '🧹' },
  { slug: 'carpet', name: 'Halı Yıkama', icon: '🏠' },
]

export default function ProviderProfile() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [pp, setPp] = useState<any>(null)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [cats, setCats] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
      const { data: pData } = await supabase.from('provider_profiles').select('*').eq('id', user!.id).single()
      setProfile(p); setPp(pData)
      setName(p?.full_name || ''); setBio(pData?.bio || '')
      setCats(pData?.service_categories || [])
    }
    load()
  }, [])

  const toggleCat = (slug: string) => {
    setCats(prev => prev.includes(slug) ? prev.filter(c => c !== slug) : [...prev, slug])
  }

  const save = async () => {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ full_name: name }).eq('id', profile.id)
    await supabase.from('provider_profiles').update({ bio, service_categories: cats }).eq('id', profile.id)
    setSaved(true); setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  const uploadDoc = async (type: 'id_document_url' | 'criminal_record_url', file: File) => {
    setUploading(type)
    const supabase = createClient()
    const path = `${profile.id}/${type}-${Date.now()}`
    await supabase.storage.from('documents').upload(path, file)
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
    await supabase.from('provider_profiles').update({ [type]: publicUrl }).eq('id', profile.id)
    setUploading('')
    alert('Belge yüklendi!')
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
            <p className="font-black text-lg">{name || 'Usta'}</p>
            <span className={pp?.status ? statusColors[pp.status] : 'badge-gray'}>
              {pp?.status ? statusLabels[pp.status] : '—'}
            </span>
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
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Hakkında</label>
            <textarea className="input resize-none" rows={3} placeholder="Kendinizi tanıtın..."
              value={bio} onChange={e => setBio(e.target.value)} />
          </div>
        </div>

        <div className="card p-5">
          <p className="font-bold text-gray-800 mb-3">Uzmanlık Alanları</p>
          <div className="grid grid-cols-3 gap-2">
            {skills.map(s => (
              <button key={s.slug} onClick={() => toggleCat(s.slug)}
                className={`p-3.5 rounded-2xl border-2 text-center transition-all ${
                  cats.includes(s.slug) ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                }`}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xs font-bold text-gray-700">{s.name}</div>
              </button>
            ))}
          </div>
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

        <button className="btn-primary py-4" onClick={save} disabled={saving}>
          {saved ? '✅ Kaydedildi!' : saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>

        <button className="btn-secondary py-4 text-red-500 border-red-100"
          onClick={async () => { await createClient().auth.signOut(); router.replace('/onboarding') }}>
          🚪 Çıkış Yap
        </button>
      </div>
    </div>
  )
}
