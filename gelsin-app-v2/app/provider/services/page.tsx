'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

type Service = {
  id: string
  title: string
  description: string | null
  price: number
  category_slug: string
  image_url: string | null
  status: string
}

const CATEGORY_OPTIONS = [
  { slug: 'repair', label: 'Acil Tamir' },
  { slug: 'cleaning', label: 'Temizlik' },
  { slug: 'carpet', label: 'Halı Yıkama' },
]

export default function ProviderServicesPage() {
  const [list, setList] = useState<Service[]>([])
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
  })
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setList([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('provider_services')
      .select('id, title, description, price, category_slug, image_url, status')
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
    setForm({
      title: '',
      description: '',
      price: '',
      category_slug: 'repair',
      image_url: '',
      status: 'active',
    })
    setModalOpen(true)
  }

  const openEdit = (s: Service) => {
    setEditingId(s.id)
    setForm({
      title: s.title,
      description: s.description || '',
      price: String(s.price),
      category_slug: s.category_slug || 'repair',
      image_url: s.image_url || '',
      status: s.status,
    })
    setModalOpen(true)
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
    const payload = {
      title,
      description: form.description.trim() || null,
      price,
      category_slug: form.category_slug,
      image_url: form.image_url.trim() || null,
      status: form.status,
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
                <select
                  value={form.category_slug}
                  onChange={(e) => setForm((f) => ({ ...f, category_slug: e.target.value }))}
                  className="input text-sm"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Vitrin görseli URL</label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  className="input text-sm"
                  placeholder="https://..."
                />
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
