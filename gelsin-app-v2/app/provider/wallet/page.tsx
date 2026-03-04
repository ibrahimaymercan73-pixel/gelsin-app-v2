'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ProviderWallet() {
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: pp } = await supabase.from('provider_profiles').select('wallet_balance').eq('id', user!.id).single()
      setBalance(pp?.wallet_balance || 0)
      const { data: tx } = await supabase.from('transactions')
        .select('*, jobs(title)').eq('to_id', user!.id).eq('type', 'provider_payout')
        .order('created_at', { ascending: false })
      setTransactions(tx || [])
    }
    load()
  }, [])

  return (
    <div>
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-5 pt-14 pb-8 text-white">
        <p className="text-blue-300 text-sm">Mevcut Bakiye</p>
        <p className="text-5xl font-black mt-1">₺{balance.toFixed(2)}</p>
        <p className="text-blue-200 text-xs mt-2">
          Tamamlanan işlerden kazanılan toplam tutar (platform komisyonu %2)
        </p>
      </div>

      <div className="px-4 py-4">
        <p className="font-bold text-gray-800 mb-3">İşlem Geçmişi</p>
        {transactions.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-3">💳</div>
            <p className="text-gray-500">Henüz işlem yok</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-xl">💰</div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900 truncate">{tx.jobs?.title || 'İş'}</p>
                  <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('tr-TR')}</p>
                </div>
                <p className="text-emerald-600 font-black">+₺{tx.amount}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
