'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { SERVICE_CATEGORIES, type ServiceCategory } from '@/lib/constants'
import { ChevronLeft, Check } from 'lucide-react'

export default function ProviderOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/onboarding')
        return
      }

      const { data: pp } = await supabase
        .from('provider_profiles')
        .select('service_categories, main_category')
        .eq('id', user.id)
        .single()

      if (pp?.main_category) {
        const cat = SERVICE_CATEGORIES.find(c => c.id === pp.main_category)
        if (cat) {
          setSelectedCategory(cat)
          setStep(2)
        }
      }
      if (pp?.service_categories) {
        setSelectedServices(pp.service_categories as string[])
      }
      setLoading(false)
    }

    load()
  }, [router])

  const selectMainCategory = (cat: ServiceCategory) => {
    setSelectedCategory(cat)
    setSelectedServices([])
    setStep(2)
  }

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    )
  }

  const goBack = () => {
    if (step === 2) {
      setStep(1)
      setSelectedCategory(null)
      setSelectedServices([])
    } else {
      router.back()
    }
  }

  const save = async () => {
    if (!selectedCategory || selectedServices.length === 0) {
      alert('Lütfen en az bir hizmet seçin.')
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/onboarding')
      return
    }

    const { error } = await supabase
      .from('provider_profiles')
      .update({
        main_category: selectedCategory.id,
        service_categories: selectedServices,
        is_onboarded: true,
      })
      .eq('id', user.id)

    setSaving(false)

    if (error) {
      alert('Kaydedilemedi: ' + error.message)
      return
    }

    router.replace('/provider')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#F4F7FA]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#F4F7FA] flex flex-col">
      <header className="px-4 sm:px-6 lg:px-10 pt-6 sm:pt-10 pb-4 border-b border-slate-200/60 bg-white">
        <button
          onClick={goBack}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm font-medium mb-3"
        >
          <ChevronLeft className="w-4 h-4" />
          Geri
        </button>
        <div className="flex gap-2 mb-4">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                s <= step ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <p className="text-xs font-bold text-blue-600 uppercase tracking-[0.2em]">
          Adım {step} / 2
        </p>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 mt-2">
          {step === 1 ? 'Hangi alanda hizmet veriyorsun?' : 'Hangi hizmetleri sunuyorsun?'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-2xl">
          {step === 1
            ? 'Önce ana uzmanlık alanını seç. Müşteriler seni bu kategoride bulacak.'
            : `"${selectedCategory?.name}" kategorisinden sunduğun hizmetleri seç.`}
        </p>
      </header>

      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 pb-32">
        <div className="max-w-4xl mx-auto">
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-slide-up">
              {SERVICE_CATEGORIES.map((cat) => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => selectMainCategory(cat)}
                    className="group p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-blue-500 hover:shadow-lg text-left transition-all flex items-start gap-4"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 transition-colors flex-shrink-0">
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm sm:text-base">
                        {cat.name}
                      </p>
                      <p className="text-[11px] sm:text-xs text-slate-500 mt-1 line-clamp-2">
                        {cat.sub.slice(0, 3).join(', ')}
                        {cat.sub.length > 3 && '...'}
                      </p>
                    </div>
                    <span className="text-slate-300 group-hover:text-blue-500 text-xl transition-colors">›</span>
                  </button>
                )
              })}
            </div>
          )}

          {step === 2 && selectedCategory && (
            <div className="space-y-6 animate-slide-up">
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  {(() => {
                    const Icon = selectedCategory.icon
                    return <Icon className="w-6 h-6" />
                  })()}
                </div>
                <div>
                  <p className="font-bold text-blue-900">{selectedCategory.name}</p>
                  <p className="text-xs text-blue-700">Ana kategori seçildi</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-700 mb-3">
                  Sunduğun hizmetleri seç ({selectedServices.length} seçili)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {selectedCategory.sub.map((service) => {
                    const isSelected = selectedServices.includes(service)
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleService(service)}
                        className={`p-3 sm:p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-slate-200 bg-white hover:border-blue-300'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            isSelected ? 'text-blue-900' : 'text-slate-700'
                          }`}
                        >
                          {service}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={save}
                disabled={saving || selectedServices.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl text-sm shadow-lg shadow-blue-600/25 disabled:shadow-none transition-all"
              >
                {saving ? 'Kaydediliyor...' : `✓ ${selectedServices.length} Hizmetle Kaydet ve Devam Et`}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
