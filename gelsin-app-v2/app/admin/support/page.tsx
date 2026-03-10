'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { HelpCircle, RefreshCw } from 'lucide-react'

type Ticket = {
  id: string
  customer_id: string | null
  provider_id: string | null
  category: string
  title: string
  message: string
  status: string
  related_job_id: string | null
  created_at: string
  updated_at: string
  admin_reply?: string | null
  replied_at?: string | null
  customer?: { full_name: string | null }[] | { full_name: string | null }
  provider?: { full_name: string | null }[] | { full_name: string | null }
}

function statusLabel(s: string): string {
  switch (s) {
    case 'pending': return 'Beklemede'
    case 'in_progress': return 'İnceleniyor'
    case 'resolved': return 'Çözüldü'
    default: return s
  }
}

function statusClass(s: string): string {
  switch (s) {
    case 'resolved': return 'bg-green-100 text-green-700'
    case 'in_progress': return 'bg-blue-100 text-blue-700'
    default: return 'bg-amber-100 text-amber-700'
  }
}

function categoryLabel(c: string): string {
  const map: Record<string, string> = {
    service: 'Hizmet',
    payment: 'Ödeme/Fatura',
    account: 'Hesap',
    feedback: 'Şikayet/Öneri',
  }
  return map[c] || c
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'customer' | 'provider'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState<string>('')

  const load = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        id,
        customer_id,
        provider_id,
        category,
        title,
        message,
        status,
        related_job_id,
        created_at,
        updated_at,
        admin_reply,
        replied_at,
        customer:profiles!support_tickets_customer_id_fkey(full_name),
        provider:profiles!support_tickets_provider_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Talepler yüklenemedi: ' + error.message)
      setTickets([])
    } else {
      const list = (data as Ticket[]) || []
      setTickets(list)
      // Detaydaki yanıt alanını mevcut admin_reply ile doldur
      const current = detailId ? list.find((t) => t.id === detailId) : null
      setReplyText(current?.admin_reply || '')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleRefund = async (t: Ticket) => {
    if (!t.related_job_id) return

    const ok = window.confirm('Bu iş için iade başlatılacak. Emin misiniz?')
    if (!ok) return

    setUpdatingId(t.id)
    try {
      const res = await fetch('/api/paytr/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: t.related_job_id }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'İade işlemi başarısız oldu.')
      } else {
        toast.success('İade talimatı gönderildi.')
        await load()
      }
    } finally {
      setUpdatingId(null)
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    const supabase = createClient()
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
    setUpdatingId(null)
    if (error) {
      toast.error('Durum güncellenemedi: ' + error.message)
      return
    }
    toast.success('Durum güncellendi.')
    load()
  }

  const getName = (t: Ticket): string => {
    const c = t.customer
    const p = t.provider
    const cName = Array.isArray(c) ? c[0]?.full_name : c?.full_name
    const pName = Array.isArray(p) ? p[0]?.full_name : p?.full_name
    if (t.customer_id && cName) return cName
    if (t.provider_id && pName) return pName
    return '—'
  }

  const sourceLabel = (t: Ticket): string => t.customer_id ? 'Müşteri' : 'Usta'

  const filtered = tickets.filter((t) => {
    if (filter === 'customer' && !t.customer_id) return false
    if (filter === 'provider' && !t.provider_id) return false
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    return true
  })

  const selectedTicket = tickets.find((t) => t.id === detailId)

  const handleReply = async () => {
    if (!selectedTicket) return
    if (!replyText.trim()) {
      toast.error('Lütfen yanıt metnini yazın.')
      return
    }
    setUpdatingId(selectedTicket.id)
    const supabase = createClient()
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('support_tickets')
      .update({ admin_reply: replyText.trim(), replied_at: now, status: 'in_progress', updated_at: now })
      .eq('id', selectedTicket.id)

    if (error) {
      setUpdatingId(null)
      toast.error('Yanıt kaydedilemedi: ' + error.message)
      return
    }

    // Müşteriye/ustaya bildirim gönder
    const targetUserId = selectedTicket.customer_id || selectedTicket.provider_id
    if (targetUserId) {
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        title: 'Destek talebinize yanıt geldi',
        body: replyText.trim(),
        type: 'support_reply',
        related_job_id: selectedTicket.related_job_id,
      })
    }

    setUpdatingId(null)
    toast.success('Yanıt gönderildi.')
    load()
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-8 h-8 text-blue-600" />
            Destek Talepleri
          </h1>
          <p className="text-slate-500 mt-1">Müşteri ve usta taleplerini görüntüleyin, durum güncelleyin.</p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </header>

      <div className="flex flex-wrap gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'customer' | 'provider')}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-700"
        >
          <option value="all">Tümü</option>
          <option value="customer">Müşteri</option>
          <option value="provider">Usta</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-700"
        >
          <option value="all">Tüm durumlar</option>
          <option value="pending">Beklemede</option>
          <option value="in_progress">İnceleniyor</option>
          <option value="resolved">Çözüldü</option>
        </select>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500">Gösterilecek talep yok.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Tarih</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Kaynak</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">İsim</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Kategori / Başlık</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Durum</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={t.customer_id ? 'text-blue-600 font-medium' : 'text-amber-600 font-medium'}>
                        {sourceLabel(t)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800">{getName(t)}</td>
                    <td className="px-4 py-3">
                      <span className="text-slate-500">{categoryLabel(t.category)}</span>
                      <br />
                      <span className="font-medium text-slate-900">{t.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${statusClass(t.status)}`}>
                        {statusLabel(t.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailId(detailId === t.id ? null : t.id)}
                          className="text-blue-600 font-medium hover:underline text-xs"
                        >
                          {detailId === t.id ? 'Gizle' : 'Detay'}
                        </button>
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t.id, e.target.value)}
                          disabled={updatingId === t.id}
                          className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium bg-white disabled:opacity-50"
                        >
                          <option value="pending">Beklemede</option>
                          <option value="in_progress">İnceleniyor</option>
                          <option value="resolved">Çözüldü</option>
                        </select>
                        {t.related_job_id && (
                          <button
                            type="button"
                            onClick={() => handleRefund(t)}
                            disabled={updatingId === t.id}
                            className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                          >
                            İade Et
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTicket && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-2">Talep detayı</h3>
          <p className="text-slate-600 whitespace-pre-wrap">{selectedTicket.message}</p>
          {selectedTicket.related_job_id && (
            <p className="text-slate-500 text-sm mt-2">İlgili iş ID: {selectedTicket.related_job_id}</p>
          )}
          {selectedTicket.admin_reply && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-1">Son admin yanıtı</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{selectedTicket.admin_reply}</p>
              {selectedTicket.replied_at && (
                <p className="text-[11px] text-slate-400 mt-1">
                  {new Date(selectedTicket.replied_at).toLocaleString('tr-TR')}
                </p>
              )}
            </div>
          )}
          <div className="mt-4 space-y-2">
            <label className="block text-xs font-semibold text-slate-600">
              Yanıt Yaz
            </label>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Müşteriye veya ustaya göndermek istediğiniz yanıtı buraya yazın..."
            />
            <button
              type="button"
              onClick={handleReply}
              disabled={updatingId === selectedTicket.id}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              Yanıtı Gönder
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
