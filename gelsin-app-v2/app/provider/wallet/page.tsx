'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { z } from 'zod'

const IBAN_SCHEMA = z.object({
  account_holder_name: z.string().min(2, 'Ad soyad en az 2 karakter olmalı').max(100),
  bank_name: z.string().min(2, 'Banka adı girin').max(100),
  iban: z
    .string()
    .transform((v) => v.replace(/\s/g, '').toUpperCase())
    .refine((v) => /^TR\d{24}$/.test(v), 'Geçerli bir TR IBAN girin (26 hane, TR ile başlar)'),
})

type BankForm = z.infer<typeof IBAN_SCHEMA>

export default function ProviderWallet() {
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [iban, setIban] = useState<string | null>(null)
  const [bankName, setBankName] = useState<string | null>(null)
  const [accountHolderName, setAccountHolderName] = useState<string | null>(null)
  const [bankModalOpen, setBankModalOpen] = useState(false)
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<BankForm>({
    account_holder_name: '',
    bank_name: '',
    iban: '',
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof BankForm, string>>>({})

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: pp } = await supabase
      .from('provider_profiles')
      .select('wallet_balance, iban, bank_name, account_holder_name')
      .eq('id', user.id)
      .single()
    setBalance(Number(pp?.wallet_balance) || 0)
    setIban(pp?.iban ?? null)
    setBankName(pp?.bank_name ?? null)
    setAccountHolderName(pp?.account_holder_name ?? null)
    setForm({
      account_holder_name: pp?.account_holder_name ?? '',
      bank_name: pp?.bank_name ?? '',
      iban: pp?.iban ?? '',
    })
    const { data: tx } = await supabase.from('transactions')
      .select('*, jobs(title)')
      .eq('to_id', user.id)
      .eq('type', 'provider_payout')
      .order('created_at', { ascending: false })
    setTransactions(tx || [])
  }

  useEffect(() => {
    load()
  }, [])

  const openBankModal = () => {
    setForm({
      account_holder_name: accountHolderName ?? '',
      bank_name: bankName ?? '',
      iban: iban ?? '',
    })
    setFormErrors({})
    setBankModalOpen(true)
  }

  const saveBankAccount = async () => {
    setFormErrors({})
    const parsed = IBAN_SCHEMA.safeParse(form)
    if (!parsed.success) {
      const err: Partial<Record<keyof BankForm, string>> = {}
      parsed.error.errors.forEach((e) => {
        const k = e.path[0] as keyof BankForm
        if (k) err[k] = e.message
      })
      setFormErrors(err)
      return
    }
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitting(false)
      return
    }
    const { error } = await supabase
      .from('provider_profiles')
      .update({
        account_holder_name: parsed.data.account_holder_name,
        bank_name: parsed.data.bank_name,
        iban: parsed.data.iban,
      })
      .eq('id', user.id)
    setSubmitting(false)
    if (error) {
      toast.error('Kayıt güncellenemedi: ' + error.message)
      return
    }
    toast.success('Banka hesabı kaydedildi')
    setBankModalOpen(false)
    load()
  }

  const handleParaCek = () => {
    if (!iban) {
      toast.error('Lütfen önce bir banka hesabı ekleyin')
      openBankModal()
      return
    }
    if (balance <= 0) {
      toast.error('Çekilebilir bakiyeniz yok')
      return
    }
    setWithdrawAmount('')
    setWithdrawModalOpen(true)
  }

  const confirmWithdraw = async () => {
    const amount = parseFloat(withdrawAmount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Geçerli bir tutar girin')
      return
    }
    if (amount > balance) {
      toast.error('Bakiye yetersiz')
      return
    }
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !iban) {
      setSubmitting(false)
      return
    }
    const { error } = await supabase.from('withdrawals').insert({
      provider_id: user.id,
      amount,
      status: 'pending',
      iban,
      bank_name: bankName ?? undefined,
      account_holder_name: accountHolderName ?? undefined,
    })
    setSubmitting(false)
    setWithdrawModalOpen(false)
    if (error) {
      toast.error('Talep oluşturulamadı: ' + error.message)
      return
    }
    toast.success('Para çekme talebiniz alındı')
    load()
  }

  const maskIban = (v: string) => {
    if (v.length < 10) return v
    return v.slice(0, 6) + ' **** **** ' + v.slice(-4)
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-5 pt-14 pb-8 text-white">
        <p className="text-blue-300 text-sm">Mevcut Bakiye</p>
        <p className="text-5xl font-black mt-1">₺{balance.toFixed(2)}</p>
        <p className="text-blue-200 text-xs mt-2">
          Tamamlanan işlerden kazanılan toplam tutar (platform komisyonu %2)
        </p>
        <button
          type="button"
          onClick={handleParaCek}
          className="mt-5 w-full py-3.5 rounded-xl font-bold text-blue-700 bg-white hover:bg-blue-50 active:scale-[0.98] transition-all shadow-lg"
        >
          Para Çek
        </button>
      </div>

      <div className="px-4 py-4">
        {/* Banka Hesaplarım */}
        <div className="card p-4 mb-4">
          <p className="font-bold text-slate-800 mb-3">Banka Hesaplarım</p>
          {iban ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{accountHolderName || '—'}</p>
                <p className="text-xs text-slate-500">{bankName || '—'}</p>
                <p className="text-xs text-slate-600 font-mono mt-0.5">{maskIban(iban)}</p>
              </div>
              <button
                type="button"
                onClick={openBankModal}
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                Düzenle
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openBankModal}
              className="w-full py-4 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-2 font-semibold transition-colors"
            >
              <span className="text-xl">+</span> Banka Hesabı Ekle
            </button>
          )}
        </div>

        {/* Özet barlar */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="card p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Çekilebilir Bakiye</p>
            <p className="text-xl font-black text-slate-900 mt-1">₺{balance.toFixed(2)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bekleyen Bakiye</p>
            <p className="text-xl font-black text-slate-400 mt-1">₺0.00</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Tamamlanan, güvenlik süresindeki tutar</p>
          </div>
        </div>

        <p className="font-bold text-gray-800 mb-3">İşlem Geçmişi</p>
        {transactions.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-3">💳</div>
            <p className="text-gray-500">Henüz işlem yok</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => {
              const netAmount = Number(tx.amount) || 0
              const grossAmount = netAmount / 0.98
              const commission = grossAmount - netAmount
              return (
                <div key={tx.id} className="card p-4 flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">💰</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{tx.jobs?.title || 'İş'}</p>
                    <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('tr-TR')}</p>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      İş Bedeli: ₺{grossAmount.toFixed(2)} | Kesinti (%2): -₺{commission.toFixed(2)}
                    </p>
                  </div>
                  <p className="text-emerald-600 font-black text-lg flex-shrink-0">+₺{netAmount.toFixed(2)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Banka hesabı modal */}
      {bankModalOpen && (
        <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-lg text-slate-900 mb-4">Banka Hesabı Ekle / Düzenle</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ad Soyad</label>
                <input
                  type="text"
                  value={form.account_holder_name}
                  onChange={(e) => setForm((f) => ({ ...f, account_holder_name: e.target.value }))}
                  className="input text-sm"
                  placeholder="Hesap sahibi adı"
                />
                {formErrors.account_holder_name && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.account_holder_name}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Banka Adı</label>
                <input
                  type="text"
                  value={form.bank_name}
                  onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                  className="input text-sm"
                  placeholder="Örn. Ziraat Bankası"
                />
                {formErrors.bank_name && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.bank_name}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">IBAN (TR, 26 hane)</label>
                <input
                  type="text"
                  value={form.iban}
                  onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                  className="input text-sm font-mono"
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                  maxLength={32}
                />
                {formErrors.iban && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.iban}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setBankModalOpen(false)}
                className="btn-secondary py-2.5 flex-1 text-sm"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={saveBankAccount}
                disabled={submitting}
                className="btn-primary py-2.5 flex-1 text-sm"
              >
                {submitting ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Para çek tutar popup */}
      {withdrawModalOpen && (
        <div className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-lg text-slate-900 mb-2">Çekilecek Tutar</h3>
            <p className="text-xs text-slate-500 mb-3">Maksimum: ₺{balance.toFixed(2)}</p>
            <input
              type="number"
              step="0.01"
              min="0"
              max={balance}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="input text-lg font-bold mb-4"
              placeholder="0.00"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWithdrawModalOpen(false)}
                className="btn-secondary py-2.5 flex-1 text-sm"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={confirmWithdraw}
                disabled={submitting || !withdrawAmount.trim()}
                className="btn-primary py-2.5 flex-1 text-sm"
              >
                {submitting ? 'Gönderiliyor...' : 'Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
