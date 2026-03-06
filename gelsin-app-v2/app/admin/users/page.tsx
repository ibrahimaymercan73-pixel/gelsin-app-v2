'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      setUsers(data || [])
    }
    load()
  }, [])

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  )

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-surface-900" style={{fontFamily:'Syne,sans-serif'}}>
          Kullanıcılar
        </h1>
        <p className="text-surface-500 mt-1">{users.length} kayıtlı kullanıcı</p>
      </div>

      <input
        className="input max-w-sm"
        placeholder="🔍 Ad veya telefon ara..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-50 border-b border-surface-100">
            <tr>
              <th className="text-left px-5 py-3 font-medium text-surface-500">Kullanıcı</th>
              <th className="text-left px-5 py-3 font-medium text-surface-500">Telefon</th>
              <th className="text-left px-5 py-3 font-medium text-surface-500">Rol</th>
              <th className="text-left px-5 py-3 font-medium text-surface-500">Kayıt Tarihi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-surface-100 rounded-lg flex items-center justify-center">
                      {u.role === 'admin' ? '⚙️' : u.role === 'provider' ? '👷' : '🏡'}
                    </div>
                    <span className="font-medium text-surface-900">{u.full_name || '—'}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-surface-600">{u.phone}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    u.role === 'provider' ? 'bg-brand-100 text-brand-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {u.role === 'admin' ? 'Admin' : u.role === 'provider' ? 'Uzman' : 'Müşteri'}
                  </span>
                </td>
                <td className="px-5 py-3 text-surface-400">
                  {new Date(u.created_at).toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
