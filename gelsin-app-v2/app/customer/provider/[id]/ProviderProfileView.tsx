'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  MapPin,
  MessageCircle,
  Sparkles,
  Star,
  Wifi,
} from 'lucide-react'
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

const REVIEW_AVATAR_RING = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-600',
]

function reviewAvatarGradient(index: number) {
  return REVIEW_AVATAR_RING[index % REVIEW_AVATAR_RING.length]
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
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-28 lg:pb-12">
      {/* Kapak — dar, yuvarlatılmış alt, premium gradient */}
      <div className="relative w-full">
        <div className="relative h-32 sm:h-36 w-full overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 shadow-[inset_0_-20px_40px_rgba(0,0,0,0.15)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <button
          type="button"
          onClick={onBack}
          className="absolute left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white shadow-lg backdrop-blur-sm transition hover:bg-white/25"
          aria-label="Geri"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2} />
        </button>

        {online && (
          <div className="absolute right-4 top-4 z-30">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <Wifi className="h-3.5 w-3.5 text-emerald-200" strokeWidth={2.5} />
              Çevrimiçi
            </span>
          </div>
        )}

        {/* Avatar — büyük, beyaz kontür, gölgeli */}
        <div className="relative z-20 mx-auto flex max-w-5xl justify-center px-4 sm:justify-start sm:px-6 lg:px-8">
          <div className="-mt-16 flex flex-col items-center sm:-mt-[4.5rem] sm:items-start">
            {profile?.avatar_url ? (
              <div className="relative">
                <div className="h-28 w-28 overflow-hidden rounded-full border-[5px] border-white bg-white shadow-[0_12px_40px_-8px_rgba(15,23,42,0.35)] ring-2 ring-slate-100 sm:h-32 sm:w-32">
                  <Image
                    src={profile.avatar_url}
                    alt=""
                    width={128}
                    height={128}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-[5px] border-white bg-gradient-to-br from-slate-100 to-slate-200 text-4xl font-bold tracking-tight text-slate-600 shadow-[0_12px_40px_-8px_rgba(15,23,42,0.35)] ring-2 ring-slate-100 sm:h-32 sm:w-32 sm:text-5xl">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-10 lg:items-start">
          <div className="space-y-8 lg:col-span-8">
            {/* İsim + rozetler */}
            <div className="text-center sm:text-left">
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start sm:gap-3">
                <h1 className="font-serif text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  {displayName}
                </h1>
                {faceVerified && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-blue-600/10 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200/80"
                    title="Kimlik doğrulandı"
                  >
                    <BadgeCheck className="h-4 w-4 text-blue-600" strokeWidth={2.5} />
                    Onaylı uzman
                  </span>
                )}
              </div>
              {profile?.city && (
                <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-slate-500 sm:justify-start">
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
                  {profile.city}
                </p>
              )}
            </div>

            {/* Stats — premium kartlar */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-amber-100/80 bg-white p-4 text-center shadow-[0_8px_30px_-12px_rgba(245,158,11,0.25)] sm:p-5">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-500" strokeWidth={2} />
                </div>
                <p className="text-2xl font-black tabular-nums text-slate-900 sm:text-3xl">
                  {rating != null ? Number(rating).toFixed(1) : '—'}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Puan</p>
              </div>
              <div className="rounded-2xl border border-blue-100/80 bg-white p-4 text-center shadow-[0_8px_30px_-12px_rgba(59,130,246,0.2)] sm:p-5">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <MessageCircle className="h-5 w-5" strokeWidth={2} />
                </div>
                <p className="text-2xl font-black tabular-nums text-slate-900 sm:text-3xl">{totalReviews}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Değerlendirme</p>
              </div>
              <div className="rounded-2xl border border-indigo-100/80 bg-white p-4 text-center shadow-[0_8px_30px_-12px_rgba(99,102,241,0.2)] sm:p-5">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Briefcase className="h-5 w-5" strokeWidth={2} />
                </div>
                <p className="text-2xl font-black tabular-nums text-slate-900 sm:text-3xl">{completedJobs}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tamamlanan iş</p>
              </div>
            </div>

            {/* Uzmanlık — lacivert/mavi ton */}
            {categories.length > 0 && (
              <div>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Uzmanlık alanları</h2>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-blue-200/90 bg-gradient-to-r from-slate-50 to-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-blue-100/50"
                    >
                      {CATEGORY_LABELS[c] || c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {providerProfile?.bio && (
              <div className="rounded-2xl border border-slate-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Hakkında</h2>
                <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{providerProfile.bio}</p>
              </div>
            )}

            {/* Yorumlar — feedback kartları */}
            <div>
              <h2 className="mb-4 text-sm font-bold text-slate-900">
                Müşteri geri bildirimleri{' '}
                {reviews.length > 0 ? (
                  <span className="font-normal text-slate-400">({reviews.length})</span>
                ) : null}
              </h2>
              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
                  <MessageCircle className="mx-auto h-10 w-10 text-slate-300" strokeWidth={1.5} />
                  <p className="mt-3 text-sm font-medium text-slate-500">Henüz değerlendirme yok</p>
                  <p className="mt-1 text-xs text-slate-400">Bu uzmanla çalışan müşteriler yorum bıraktıkça burada görünecek.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {reviews.map((r, idx) => {
                    const initial = (r.customer_name || 'M').charAt(0).toUpperCase()
                    return (
                      <li
                        key={r.id}
                        className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] transition hover:shadow-md"
                      >
                        <div className="flex gap-4">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-white shadow-inner ${reviewAvatarGradient(idx)}`}
                          >
                            {initial}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-slate-900">
                                {r.customer_name?.trim() || 'Müşteri'}
                              </span>
                              <span className="text-xs text-slate-400">
                                {new Date(r.created_at).toLocaleDateString('tr-TR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-amber-500">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-200'}`}
                                  strokeWidth={2}
                                />
                              ))}
                            </div>
                            <p className="mt-3 text-sm leading-relaxed text-slate-600">
                              {r.comment && r.comment.trim().length > 0 ? r.comment : 'Yorum metni yok.'}
                            </p>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* İlanlar */}
            <div>
              <h2 className="mb-4 text-sm font-bold text-slate-900">
                Aktif ilanlar{' '}
                {services.length > 0 ? (
                  <span className="font-normal text-slate-400">({services.length})</span>
                ) : null}
              </h2>
              {services.length === 0 ? (
                <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-blue-50/30 px-6 py-14 text-center shadow-inner">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-100">
                    <Sparkles className="h-8 w-8 text-blue-500" strokeWidth={1.75} />
                  </div>
                  <p className="mt-5 font-serif text-lg font-semibold text-slate-800">Bu uzman henüz ilan yayınlamadı</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                    Yakında burada sunduğu hizmetleri görebilirsiniz. İsterseniz doğrudan iş talebi oluşturarak bu uzmandan teklif
                    alabilirsiniz.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {services.map((s) => (
                    <Link
                      key={s.id}
                      href={`/customer/services/${s.id}`}
                      className="group rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5"
                    >
                      <div className="flex gap-3">
                        {s.image_url ? (
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-100">
                            <Image
                              src={s.image_url}
                              alt=""
                              width={64}
                              height={64}
                              className="h-full w-full object-cover transition group-hover:scale-105"
                            />
                          </div>
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 text-2xl text-slate-300">
                            🔧
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 font-semibold text-slate-900">{s.title}</p>
                            <span className="shrink-0 rounded-lg border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-800">
                              {CATEGORY_LABELS[s.category_slug] || s.category_slug}
                            </span>
                          </div>
                          <p className="mt-1.5 font-bold text-blue-700">₺{Number(s.price).toFixed(0)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Masaüstü: sağ sütun CTA */}
          <aside className="mt-8 hidden lg:col-span-4 lg:mt-0 lg:block">
            <div className="sticky top-6 space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hızlı aksiyon</p>
              <Link
                href="/customer/new-job"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 py-4 text-center text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-105"
              >
                <Sparkles className="h-5 w-5" strokeWidth={2} />
                Hemen teklif al
              </Link>
              <Link
                href="/customer/messages"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-800 transition hover:border-blue-300 hover:bg-slate-50"
              >
                <MessageCircle className="h-5 w-5 text-blue-600" strokeWidth={2} />
                Mesaj gönder
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobil: sabit alt CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-lg lg:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <Link
            href="/customer/new-job"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30"
          >
            <Sparkles className="h-4 w-4 shrink-0" strokeWidth={2} />
            Teklif al
          </Link>
          <Link
            href="/customer/messages"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-800"
          >
            <MessageCircle className="h-4 w-4 shrink-0 text-blue-600" strokeWidth={2} />
            Mesaj
          </Link>
        </div>
      </div>
    </div>
  )
}
