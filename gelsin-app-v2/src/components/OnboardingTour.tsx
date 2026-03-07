'use client'

import { useEffect, useRef } from 'react'
import { driver, type DriveStep, type Driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const STORAGE_KEY = 'gelsin_hasSeenTour'

const CUSTOMER_STEPS: DriveStep[] = [
  {
    element: '[data-tour="customer-ana-sayfa"]',
    popover: {
      title: 'Hemen Başlayın!',
      description:
        'İhtiyacınız olan hizmet kategorisini buradan seçerek saniyeler içinde iş talebi oluşturabilirsiniz.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="customer-islerim"]',
    popover: {
      title: 'İş Takibi!',
      description:
        'Oluşturduğunuz işleri ve gelen teklifleri buradan takip edebilirsiniz.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="customer-mesajlar"]',
    popover: {
      title: 'Anında İletişim!',
      description:
        'Uzmanlarla yaptığınız pazarlıkları ve mesajları buradan yönetin.',
      side: 'right',
      align: 'start',
    },
  },
]

const PROVIDER_STEPS: DriveStep[] = [
  {
    element: '[data-tour="provider-radar"]',
    popover: {
      title: 'Fırsat Radarı!',
      description:
        'Çevrenizdeki yeni iş fırsatları anlık olarak buraya düşer.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="provider-cuzdan"]',
    popover: {
      title: 'Kazancınızı Yönetin!',
      description:
        'Bakiyenizi ve profil puanınızı buradan kontrol edin.',
      side: 'right',
      align: 'start',
    },
  },
]

export function OnboardingTour({ role }: { role: 'customer' | 'provider' | null }) {
  const driverRef = useRef<Driver | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !role) return
    if (localStorage.getItem(STORAGE_KEY) === 'true') return

    const steps = role === 'customer' ? CUSTOMER_STEPS : PROVIDER_STEPS
    const hasAllTargets = steps.every((s) => {
      const sel = typeof s.element === 'string' ? s.element : null
      return sel && document.querySelector(sel)
    })
    if (!hasAllTargets) return

    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: '#0f172a',
      overlayOpacity: 0.6,
      stagePadding: 8,
      stageRadius: 12,
      popoverClass: 'gelsin-tour-popover',
      popoverOffset: 12,
      nextBtnText: 'İleri',
      prevBtnText: 'Geri',
      doneBtnText: 'Bitir',
      progressText: '{{current}} / {{total}}',
      steps,
      onDestroyStarted: () => {
        try {
          localStorage.setItem(STORAGE_KEY, 'true')
        } catch (_) {}
      },
      onDestroyed: () => {
        driverRef.current = null
      },
    })

    driverRef.current = driverObj
    const t = setTimeout(() => driverObj.drive(), 600)
    return () => {
      clearTimeout(t)
      driverRef.current?.destroy()
      driverRef.current = null
    }
  }, [role])

  return null
}
