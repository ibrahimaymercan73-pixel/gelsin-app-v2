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
    <div>
      <div id={divId} className="rounded-xl overflow-hidden" />
      <p className="text-xs text-surface-400 text-center mt-3">
        Kameranızı müşterinin QR koduna tutun
      </p>
    </div>
  )
}
