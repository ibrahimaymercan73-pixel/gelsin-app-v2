'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type MessageRow = {
  id: string
  body: string
  created_at: string
  job_id: string
  job_title: string
  customer_name: string
  provider_name: string
}

export default function AdminMessagesPage() {
  const [rows, setRows] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()

      const { data: messages } = await supabase
        .from('messages')
        .select('id, job_id, sender_id, receiver_id, body, created_at')
        .order('created_at', { ascending: false })
        .limit(200)

      const list = (messages || []) as any[]

      if (list.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      const jobIds = Array.from(new Set(list.map((m) => m.job_id as string)))
      const userIds = Array.from(
        new Set(
          list.flatMap((m) => [m.sender_id as string, m.receiver_id as string])
        )
      )

      const [{ data: jobs }, { data: profiles }] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, title, customer_id, provider_id')
          .in('id', jobIds),
        supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', userIds),
      ])

      const jobsById = Object.fromEntries(
        (jobs || []).map((j: any) => [j.id as string, j])
      )
      const profilesById = Object.fromEntries(
        (profiles || []).map((p: any) => [p.id as string, p])
      )

      const mapped: MessageRow[] = list.map((m) => {
        const job = jobsById[m.job_id as string]
        const customer =
          job && profilesById[job.customer_id as string]
            ? profilesById[job.customer_id as string].full_name
            : 'Müşteri'
        const provider =
          job && profilesById[job.provider_id as string]
            ? profilesById[job.provider_id as string].full_name
            : 'Usta'

        return {
          id: m.id,
          body: m.body as string,
          created_at: m.created_at as string,
          job_id: m.job_id as string,
          job_title: job?.title || 'İş',
          customer_name: customer,
          provider_name: provider,
        }
      })

      setRows(mapped)
      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#F4F7FA]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-extrabold text-surface-900"
            style={{ fontFamily: 'Syne,sans-serif' }}
          >
            Mesaj Kayıtları
          </h1>
          <p className="text-surface-500 mt-1">
            Müşteri ve ustalar arasındaki son {rows.length} mesaj
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-50 border-b border-surface-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-surface-500">
                İş
              </th>
              <th className="text-left px-4 py-3 font-medium text-surface-500">
                Müşteri
              </th>
              <th className="text-left px-4 py-3 font-medium text-surface-500">
                Usta
              </th>
              <th className="text-left px-4 py-3 font-medium text-surface-500">
                Mesaj
              </th>
              <th className="text-left px-4 py-3 font-medium text-surface-500">
                Tarih
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr
                key={m.id}
                className="border-b border-surface-50 hover:bg-surface-50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/customer/jobs/${m.job_id}`}
                    className="text-surface-800 font-medium hover:underline"
                  >
                    {m.job_title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-surface-600">{m.customer_name}</td>
                <td className="px-4 py-3 text-surface-600">{m.provider_name}</td>
                <td className="px-4 py-3 text-surface-700 max-w-xs truncate">
                  {m.body}
                </td>
                <td className="px-4 py-3 text-surface-400 text-xs">
                  {new Date(m.created_at).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

