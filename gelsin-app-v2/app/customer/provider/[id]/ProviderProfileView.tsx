'use client'

import Link from 'next/link'
import Image from 'next/image'
import { isOnline } from '@/lib/presence'

const CATEGORY_LABELS: Record<string, string> = {
  painting: 'Boya',
  plumbing: 'Tesisat',
  carpentry: 'Marangoz',
  electric: 'Elektrik',
  cleaning: 'Temizlik',
  assembly: 'Montaj',
  repair: 'Tamir',
}

const BADGE_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-sky-100 text-sky-700 border-sky-200',
  'bg-slate-100 text-slate-700 border-slate-200',
]

function getBadgeColor(index: number) {
  return BADGE_COLORS[index % BADGE_COLORS.length]
}

const AVATAR_COLORS = [
  'bg-blue-500 text-white',
  'bg-emerald-500 text-white',
  'bg-violet-500 text-white',
  'bg-amber-500 text-white',
  'bg-rose-500 text-white',
]

function getAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
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
  last_seen?: string | null
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
  const online = isOnline(providerProfile?.last_seen)

  return (
    <div className="min-h-screen bg-gray-100 pb-24 w-full">
      {/* Header — gradient + avatar + name + city + tick + online badge */}
      <div className="relative w-full">
        <div className="h-40 w-full bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900" />
        <button
          type="button"
          onClick={onBack}
          className="absolute top-4 left-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30"
          aria-label="Geri"
        >
          ←
        </button>
        <div className="absolute top-4 right-4">
          {online && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-sm font-medium text-emerald-700 shadow-md">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Çevrimiçi
            </span>
          )}
        </div>
      </div>

      <div className="w-full px-4 -mt-12 flex items-center justify-center">
        {profile?.avatar_url ? (
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white">
            <Image
              src={profile.avatar_url}
              alt=""
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl bg-slate-200 flex items-center justify-center text-3xl font-bold text-slate-600">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="w-full px-4 pt-4 space-y-5">
        {/* Ad soyad + şehir + mavi tik */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
            {faceVerified && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm" title="Kimlik doğrulandı">✓</span>
            )}
          </div>
          {profile?.city && (
            <p className="text-sm text-gray-500 mt-0.5 flex items-center justify-center gap-1">
              <span>📍</span>
              <span>{profile.city}</span>
            </p>
          )}
        </div>

        {/* STATS — 3 yatay kart */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 text-center">
            <p className="text-2xl font-black text-amber-500">★ {rating != null ? Number(rating).toFixed(1) : '—'}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Puan</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 text-center">
            <p className="text-2xl font-black text-gray-900">{totalReviews}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Değerlendirme</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 text-center">
            <p className="text-2xl font-black text-gray-900">{completedJobs}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Tamamlanan iş</p>
          </div>
        </div>

        {/* KATEGORİLER — renkli badge'ler */}
        {categories.length > 0 && (
          <div className="w-full">
            <h2 className="text-sm font-bold text-gray-800 mb-2">Uzman Olduğu Alanlar</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((c, idx) => (
                <span
                  key={c}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getBadgeColor(idx)}`}
                >
                  {CATEGORY_LABELS[c] || c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* HAKKINDA — sadece bio varsa, italik gri */}
        {providerProfile?.bio && (
          <div className="w-full">
            <h2 className="text-sm font-bold text-gray-800 mb-1.5">Hakkında</h2>
            <p className="text-sm text-gray-500 italic whitespace-pre-wrap">{providerProfile.bio}</p>
          </div>
        )}

        {/* YORUMLAR — kart içinde, avatar + yıldız + tarih + metin */}
        <div className="w-full">
          <h2 className="text-sm font-bold text-gray-800 mb-2">Müşteri yorumları {reviews.length > 0 ? `(${reviews.length})` : ''}</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Henüz yorum yok.</p>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r, idx) => (
                <li key={r.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${getAvatarColor(idx)}`}>
                      {(r.customer_name || 'M').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-amber-500 text-sm font-medium">★ {r.rating}</span>
                        <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1.5">
                        {r.comment && r.comment.trim().length > 0 ? r.comment : 'Yorum yapılmadı'}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* İLANLAR — grid 2 kolon (mobilde 1), kart + hover */}
        <div className="w-full">
          <h2 className="text-sm font-bold text-gray-800 mb-2">İlanlar {services.length > 0 ? `(${services.length})` : ''}</h2>
          {services.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Aktif ilan yok.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {services.map((s, idx) => (
                <Link
                  key={s.id}
                  href={`/customer/services/${s.id}`}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.98] p-4"
                >
                  <div className="flex gap-3">
                    {s.image_url ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                        <Image
                          src={s.image_url}
                          alt=""
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-300 text-2xl">
                        🔧
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-gray-900 text-sm line-clamp-2">{s.title}</p>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getBadgeColor(idx)} shrink-0`}>
                          {CATEGORY_LABELS[s.category_slug] || s.category_slug}
                        </span>
                      </div>
                      <p className="text-blue-600 font-bold text-sm mt-1">₺{Number(s.price).toFixed(0)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
