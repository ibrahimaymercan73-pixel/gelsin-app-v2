'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { CITIES_SERVICE } from '@/lib/constants'

type Service = {
  id: string
  title: string
  description: string | null
  price: number
  category_slug: string
  image_url: string | null
  status: string
  city?: string | null
}

const CATEGORY_OPTIONS = [
  { slug: 'repair', label: 'Acil Tamir' },
  { slug: 'cleaning', label: 'Temizlik' },
  { slug: 'carpet', label: 'Halı Yıkama' },
]

export default function ProviderServicesPage() {
  const [list, setList] = useState<Service[]>([])
  const [profileCity, setProfileCity] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category_slug: 'repair',
    image_url: '',
    status: 'active',
    city: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const allowedCategorySlugs = useMemo(() => {
    const fromActive = [...new Set(list.filter(s => s.status === 'active').map(s => s.category_slug))]
    if (fromActive.length > 0) return fromActive
    return CATEGORY_OPTIONS.map(c => c.slug)
  }, [list])

  const categoryOptionsForDropdown = useMemo(() => {
    return CATEGORY_OPTIONS.filter(c => allowedCategorySlugs.includes(c.slug))
  }, [allowedCategorySlugs])

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setList([])
      setLoading(false)
      return
    }
    const { data: profile } = await supabase.from('profiles').select('city').eq('id', user.id).single()
    setProfileCity(profile?.city || '')
    const { data } = await supabase
      .from('provider_services')
      .select('id, title, description, price, category_slug, image_url, status, city')
      .eq('provider_id', user.id)
      .order('created_at', { ascending: false })
    setList((data as Service[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const openNew = () => {
    setEditingId(null)
    setImageFile(null)
    const defaultCity = profileCity && CITIES_SERVICE.includes(profileCity as any) ? profileCity : (CITIES_SERVICE[0] ?? '')
    setForm({
      title: '',
      description: '',
      price: '',
      category_slug: categoryOptionsForDropdown[0]?.slug ?? 'repair',
      image_url: '',
      status: 'active',
      city: defaultCity,
    })
    setModalOpen(true)
  }

  const openEdit = (s: Service) => {
    setEditingId(s.id)
    setImageFile(null)
    setForm({
      title: s.title,
      description: s.description || '',
      price: String(s.price),
      category_slug: s.category_slug || 'repair',
      image_url: s.image_url || '',
      status: s.status,
      city: s.city || profileCity || CITIES_SERVICE[0] || '',
    })
    setModalOpen(true)
  }

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Lütfen bir resim seçin (JPEG/PNG)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya 5MB\'dan küçük olmalı')
      return
    }
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'job-media')
      formData.append('subpath', 'service')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Yükleme başarısız')
      setForm((f) => ({ ...f, image_url: data.publicUrl }))
      setImageFile(file)
      toast.success('Görsel yüklendi')
    } catch (err: any) {
      toast.error(err?.message || 'Görsel yüklenemedi')
    } finally {
      setUploadingImage(false)
    }
  }

  const save = async () => {
    const title = form.title.trim()
    const price = parseFloat(form.price.replace(',', '.'))
    if (!title) {
      toast.error('Başlık girin')
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      toast.error('Geçerli bir fiyat girin')
      return
    }
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitting(false)
      return
    }
    const cityVal = form.city?.trim()
    if (!cityVal) {
      toast.error('Şehir seçin.')
      setSubmitting(false)
      return
    }
    const payload = {
      title,
      description: form.description.trim() || null,
      price,
      category_slug: form.category_slug,
      image_url: form.image_url.trim() || null,
      status: form.status,
      city: cityVal,
      updated_at: new Date().toISOString(),
    }
    if (editingId) {
      const { error } = await supabase
        .from('provider_services')
        .update(payload)
        .eq('id', editingId)
        .eq('provider_id', user.id)
      if (error) {
        toast.error(error.message)
        setSubmitting(false)
        return
      }
      toast.success('İlan güncellendi')
    } else {
      const { error } = await supabase
        .from('provider_services')
        .insert({ ...payload, provider_id: user.id })
      if (error) {
        toast.error(error.message)
        setSubmitting(false)
        return
      }
      toast.success('İlan eklendi')
    }
    setModalOpen(false)
    setSubmitting(false)
    load()
  }

  const toggleStatus = async (s: Service) => {
    const supabase = createClient()
    const next = s.status === 'active' ? 'inactive' : 'active'
    await supabase
      .from('provider_services')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', s.id)
    toast.success(next === 'active' ? 'İlan yayında' : 'İlan pasife alındı')
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#F4F7FA]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#F4F7FA]">
      <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-6">
        <h1 className="text-xl lg:text-2xl font-black text-slate-800">İlanlarım / Kampanyalarım</h1>
        <p className="text-slate-500 text-sm mt-1">Vitrinde görünecek hizmet paketlerinizi yönetin</p>
        <button
          type="button"
          onClick={openNew}
          className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700"
        >
          + Yeni İlan Ekle
        </button>
      </header>

      <div className="p-4 lg:p-8 max-w-4xl">
        {list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
            <p className="text-slate-500 mb-4">Henüz ilan eklemediniz</p>
            <button
              type="button"
              onClick={openNew}
              className="text-blue-600 font-semibold"
            >
              + Yeni İlan Ekle
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-4 items-start"
              >
                {s.image_url ? (
                  <img
                    src={s.image_url}
                    alt=""
                    className="w-full sm:w-24 h-32 sm:h-24 object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full sm:w-24 h-32 sm:h-24 bg-slate-100 rounded-xl flex items-center justify-center text-3xl">
                    🔧
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900">{s.title}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">₺{Number(s.price).toFixed(2)}</p>
                  <p className="text-xs text-slate-400">
                    {CATEGORY_OPTIONS.find((c) => c.slug === s.category_slug)?.label || s.category_slug}
                  </p>
                  <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {s.status === 'active' ? 'Yayında' : 'Pasif'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    className="btn-secondary py-2 px-4 text-sm"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleStatus(s)}
                    className="py-2 px-4 text-sm rounded-xl border border-slate-200 hover:bg-slate-50"
                  >
                    {s.status === 'active' ? 'Pasife al' : 'Yayınla'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg text-slate-900 mb-4">
              {editingId ? 'İlanı Düzenle' : 'Yeni İlan Ekle'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Başlık *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="input text-sm"
                  placeholder="Örn: Detaylı Kombi Bakımı"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Açıklama</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="input text-sm resize-none"
                  rows={3}
                  placeholder="Hizmet detayı..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fiyat (₺) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="input text-sm"
                  placeholder="500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Kategori</label>
                {categoryOptionsForDropdown.length === 0 ? (
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    Önce Profil &gt; Hizmetlerim bölümünden hizmet ekleyin.
                  </p>
                ) : (
                  <select
                    value={form.category_slug}
                    onChange={(e) => setForm((f) => ({ ...f, category_slug: e.target.value }))}
                    className="input text-sm"
                  >
                    {categoryOptionsForDropdown.map((c) => (
                      <option key={c.slug} value={c.slug}>{c.label}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Şehir *</label>
                <select
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="input text-sm"
                >
                  <option value="">Şehir seçin</option>
                  {CITIES_SERVICE.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Vitrin görseli</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 bg-slate-50/50 cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={uploadImage}
                      disabled={uploadingImage}
                    />
                    {uploadingImage ? (
                      <span className="text-sm text-slate-500">Yükleniyor...</span>
                    ) : (
                      <>
                        <span className="text-lg">📷</span>
                        <span className="text-sm font-medium text-slate-600">Görsel seç veya sürükle</span>
                      </>
                    )}
                  </label>
                  {form.image_url && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video max-h-32">
                      <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, image_url: '' }))}
                        className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Durum</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="input text-sm"
                >
                  <option value="active">Yayında</option>
                  <option value="inactive">Pasif</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="btn-secondary py-2.5 flex-1 text-sm"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={save}
                disabled={submitting}
                className="btn-primary py-2.5 flex-1 text-sm"
              >
                {submitting ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
