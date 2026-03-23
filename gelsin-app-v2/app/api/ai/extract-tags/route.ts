import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  console.log('=== EXTRACT TAGS BAŞLADI ===')
  const { job_id, description, title } = await req.json()
  console.log('Body:', { job_id, description, title })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const stopWords = ['ve', 'ile', 'bir', 'bu', 'şu', 'da', 
    'de', 'mi', 'mu', 'mü', 'için', 'ama', 'fakat', 'veya',
    'olan', 'olur', 'edilir', 'yapılır', 'istiyorum', 'lazım',
    'gerek', 'var', 'yok', 'çok', 'az', 'büyük', 'küçük',
    'the', 'bir', 'ben', 'sen', 'biz', 'onlar', 'gibi']

  const text = `${title} ${description}`.toLowerCase()
  const words = text
    .replace(/[^a-züğışçö\s]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !stopWords.includes(w))

  const freq: Record<string, number> = {}
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1 })

  const tags = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)
  console.log('Tags:', tags)

  // job_tags tablosuna kaydet
  if (tags.length > 0) {
    await supabase.from('job_tags').insert(
      tags.map(tag => ({
        job_id,
        tag: tag.toLowerCase().trim(),
      }))
    )
  }

  // Etiket eşleşen uzmanlara bildirim gönder
  const { data: matchingProviders } = await supabase
    .from('expertise_tags')
    .select('provider_id')
    .in('tag', tags.map(t => t.toLowerCase().trim()))
  console.log('Matched providers:', matchingProviders?.length)

  if (matchingProviders && matchingProviders.length > 0) {
    const uniqueProviders = Array.from(new Set(matchingProviders.map(p => p.provider_id)))

    await supabase.from('notifications').insert(
      uniqueProviders.map(provider_id => ({
        user_id: provider_id,
        title: '🎯 Sana Özel İş!',
        body: `"${title}" - Uzmanlık alanınla eşleşen yeni bir iş var!`,
        type: 'matched_job',
        is_read: false,
        related_job_id: job_id,
      }))
    )
  }

  return NextResponse.json({ tags, matched: matchingProviders?.length || 0 })
}
