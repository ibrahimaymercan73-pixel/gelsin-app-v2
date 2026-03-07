'use client'

import { useEffect, useState } from 'react'
import Joyride, { STATUS, type Step, type CallBackProps } from 'react-joyride'

/** Tur bir kez bitirildiğinde veya atlandığında localStorage'a yazılır; tekrar gösterilmez. */
const STORAGE_KEY = 'gelsin_hasSeenTour'

/** Müşteri paneli tur adımları. target değerleri customer layout'taki nav link id'leri ile eşleşmeli. */
const CUSTOMER_STEPS: Step[] = [
  {
    target: '#tour-ana-sayfa',
    content: 'İhtiyacınız olan hizmet kategorisini buradan seçerek saniyeler içinde iş talebi oluşturabilirsiniz.',
    title: 'Hemen Başlayın!',
    disableBeacon: true,
    placement: 'right',
  },
  {
    target: '#tour-jobs',
    content: 'Oluşturduğunuz işleri ve gelen teklifleri buradan takip edebilirsiniz.',
    title: 'İş Takibi!',
    disableBeacon: true,
    placement: 'right',
  },
  {
    target: '#tour-mesajlar',
    content: 'Uzmanlarla yaptığınız pazarlıkları ve mesajları buradan yönetin.',
    title: 'Anında İletişim!',
    disableBeacon: true,
    placement: 'right',
  },
]

/** Uzman paneli tur adımları. target değerleri provider layout'taki nav link id'leri ile eşleşmeli. */
const PROVIDER_STEPS: Step[] = [
  {
    target: '#tour-radar',
    content: 'Çevrenizdeki yeni iş fırsatları anlık olarak buraya düşer.',
    title: 'Fırsat Radarı!',
    disableBeacon: true,
    placement: 'right',
  },
  {
    target: '#tour-wallet',
    content: 'Bakiyenizi ve profil puanınızı buradan kontrol edin.',
    title: 'Kazancınızı Yönetin!',
    disableBeacon: true,
    placement: 'right',
  },
]

/** Joyride buton metinleri (Türkçe). */
const LOCALE = {
  back: 'Geri',
  close: 'Kapat',
  last: 'Bitir',
  next: 'İleri',
  skip: 'Atla',
}

/** Gelsin temasına uygun tur baloncuk stilleri (primaryColor, zIndex, tooltip köşe/padding). */
const STYLES = {
  options: {
    primaryColor: '#2563eb',
    textColor: '#1e293b',
    zIndex: 10000,
    arrowColor: '#fff',
    backgroundColor: '#fff',
    overlayColor: 'rgba(15, 23, 42, 0.7)',
  },
  tooltip: {
    borderRadius: '12px',
    padding: '16px',
  },
  tooltipContainer: {
    textAlign: 'left' as const,
  },
  buttonNext: {
    backgroundColor: '#2563eb',
    borderRadius: '12px',
    padding: '10px 16px',
    fontWeight: 600,
  },
  buttonBack: {
    color: '#64748b',
    marginRight: 8,
  },
  buttonSkip: {
    color: '#64748b',
  },
  buttonClose: {
    color: '#64748b',
    right: 12,
    top: 12,
  },
}

export function OnboardingTour({ role }: { role: 'customer' | 'provider' | null }) {
  const [run, setRun] = useState(false)
  const [steps, setSteps] = useState<Step[]>([])

  useEffect(() => {
    if (typeof window === 'undefined' || !role) return
    if (localStorage.getItem(STORAGE_KEY) === 'true') return
    const stepList = role === 'customer' ? CUSTOMER_STEPS : PROVIDER_STEPS
    setSteps(stepList)
    const t = setTimeout(() => setRun(true), 800)
    return () => clearTimeout(t)
  }, [role])

  /** Bitir / Kapat / Atla ile tur bittiğinde veya atlandığında: turu kapat, localStorage'a yaz. */
  const handleCallback = (data: CallBackProps) => {
    const { status } = data
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      try {
        localStorage.setItem(STORAGE_KEY, 'true')
      } catch (_) {}
      setRun(false)
    }
  }

  if (!run || steps.length === 0) return null

  return (
    <Joyride
      run={run}
      steps={steps}
      callback={handleCallback}
      continuous
      showProgress
      showSkipButton
      locale={LOCALE}
      styles={STYLES}
      scrollToFirstStep
      spotlightClicks={false}
      disableOverlayClose={false}
    />
  )
}
