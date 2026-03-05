'use client'
import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface Props {
  onScan: (data: string) => void
}

export default function QrScanner({ onScan }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const divId = 'qr-scanner-div'

  useEffect(() => {
    const scanner = new Html5Qrcode(divId)
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        onScan(decodedText)
      },
      undefined
    ).catch(err => console.error('QR Scanner error:', err))

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [onScan])

  return (
    <div className="w-full flex flex-col items-center">
      <div
        id={divId}
        className="w-full max-w-sm aspect-square md:aspect-video rounded-2xl overflow-hidden bg-black/90"
      />
      <p className="text-xs text-surface-400 text-center mt-3 px-2">
        Kameranızı müşterinin QR koduna tutun
      </p>
    </div>
  )
}
