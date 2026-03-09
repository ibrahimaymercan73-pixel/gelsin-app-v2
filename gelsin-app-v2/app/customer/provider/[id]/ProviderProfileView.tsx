'use client'

import Link from 'next/link'
import Image from 'next/image'

const CATEGORY_LABELS: Record<string, string> = {
  painting: 'Boya',
  plumbing: 'Tesisat',
  carpentry: 'Marangoz',
  electric: 'Elektrik',
  cleaning: 'Temizlik',
  assembly: 'Montaj',
  repair: 'Tamir',
}

type ProfilePublic = {
  id: string
  full_name: string | null
  avatar_url: string | null
  face_verified?: boolean
  city: string | null
}

type ProviderProfile = {
  id: string
  bio: string | null
  rating: number | null
  total_reviews: number
  completed_jobs: number
  service_categories: string[]
}

type ReviewRow = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  customer_id: string
  customer_name: string | null
}

type ServiceRow = {
  id: string
  title: string
  description: string | null
  price: number
  category_slug: string
  image_url: string | null
  city: string | null
}

type Props = {
  profile: ProfilePublic | null
  providerProfile: ProviderProfile | null
  reviews: ReviewRow[]
  services: ServiceRow[]
  onBack: () => void
}

export function ProviderProfileView({ profile, providerProfile, reviews, services, onBack }: Props) {
  const displayName = profile?.full_name || 'Uzman'
  const rating = providerProfile?.rating ?? null
  const totalReviews = providerProfile?.total_reviews ?? 0
  const completedJobs = providerProfile?.completed_jobs ?? 0
  const categories = providerProfile?.service_categories ?? []
  const faceVerified = !!profile?.face_verified

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Geri"
        >
          ←
        </button>
        <h1 className="font-bold text-gray-900 truncate flex-1">Uzman Profili</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {profile?.avatar_url ? (
          <div className="card p-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 mb-3">
              <Image
                src={profile.avatar_url}
                alt=""
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
              {faceVerified && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm" title="Kimlik doğrulandı">✓</span>
              )}
            </div>
            {profile?.city && <p className="text-sm text-gray-500 mt-1">📍 {profile.city}</p>}
          </div>
        ) : (
          <div className="card p-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-2xl bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-600 mb-3">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
              {faceVerified && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm" title="Kimlik doğrulandı">✓</span>
              )}
            </div>
            {profile?.city && <p className="text-sm text-gray-500 mt-1">📍 {profile.city}</p>}
          </div>
        )}

        <div className="card p-4">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-2xl font-black text-amber-500">{rating != null ? Number(rating).toFixed(1) : '—'}</p>
              <p className="text-xs text-gray-500">Puan</p>
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{totalReviews}</p>
              <p className="text-xs text-gray-500">Değerlendirme</p>
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{completedJobs}</p>
              <p className="text-xs text-gray-500">Tamamlanan iş</p>
            </div>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 text-sm mb-2">Hizmet kategorileri</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <span key={c} className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-700">
                  {CATEGORY_LABELS[c] || c}
                </span>
              ))}
            </div>
          </div>
        )}

        {providerProfile?.bio && (
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 text-sm mb-2">Hakkında</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{providerProfile.bio}</p>
          </div>
        )}

        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Müşteri yorumları {reviews.length > 0 ? `(${reviews.length})` : ''}</h3>
          {reviews.length === 0 ? (
            <p className="text-sm text-gray-500">Henüz yorum yok.</p>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-amber-500 text-sm">★ {r.rating}</span>
                    <span className="text-xs text-gray-500">
                      {r.customer_name || 'Müşteri'} · {new Date(r.created_at).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">İlanlar {services.length > 0 ? `(${services.length})` : ''}</h3>
          {services.length === 0 ? (
            <p className="text-sm text-gray-500">Aktif ilan yok.</p>
          ) : (
            <ul className="space-y-3">
              {services.map((s) => (
                <li key={s.id}>
                  <Link href={`/customer/services/${s.id}`} className="block p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100">
                    <div className="flex gap-3">
                      {s.image_url ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                          <Image src={s.image_url} alt="" width={64} height={64} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-400 text-xl">🔧</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm truncate">{s.title}</p>
                        <p className="text-blue-600 font-bold text-sm">₺{Number(s.price).toFixed(0)}</p>
                        {s.city && <p className="text-xs text-gray-500">{s.city}</p>}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
