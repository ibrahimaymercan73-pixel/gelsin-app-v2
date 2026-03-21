'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

/** Mesh + deep navy — artı desen yok */
export function AuthLeftPanel({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
  title: string
  subtitle: string
}) {
  return (
    <div className="relative hidden min-h-0 flex-col justify-center overflow-hidden px-12 py-16 text-white lg:flex lg:w-[46%] xl:w-[44%]">
      <div className="pointer-events-none absolute inset-0 bg-[#05080f]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 15% 20%, rgba(59, 130, 246, 0.28), transparent 55%),
            radial-gradient(ellipse 70% 50% at 85% 10%, rgba(99, 102, 241, 0.22), transparent 50%),
            radial-gradient(ellipse 60% 45% at 70% 85%, rgba(6, 182, 212, 0.14), transparent 55%),
            radial-gradient(ellipse 50% 40% at 10% 90%, rgba(37, 99, 235, 0.12), transparent 50%),
            linear-gradient(165deg, #0a1020 0%, #05080f 45%, #03050a 100%)
          `,
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/20" aria-hidden />

      <div className="relative z-[1] max-w-lg">
        <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.22em] text-white/35">{eyebrow}</p>
        <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-white xl:text-5xl xl:leading-[1.06]">
          {title}
        </h1>
        <p className="mt-6 max-w-md text-lg font-normal leading-relaxed text-white/50">{subtitle}</p>
      </div>
    </div>
  )
}

export function AuthMobileBar({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center border-b border-white/10 bg-[#05080f] px-4 py-3.5 lg:hidden">
      <p className="text-[15px] font-medium text-white/90">{label}</p>
    </div>
  )
}

export function AuthPageBackground({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#eceef2] antialiased lg:flex-row" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {children}
    </div>
  )
}

export function AuthFormCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-black/[0.06] bg-white/90 p-8 shadow-[0_2px_24px_-6px_rgba(0,0,0,0.12),0_8px_32px_-12px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-9">
      {children}
    </div>
  )
}

export const authInputClass =
  'h-10 w-full rounded-lg border-0 bg-slate-100/90 px-3.5 text-[14px] text-slate-900 shadow-none outline-none transition-[background-color,box-shadow] placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/30'

export const authLabelClass = 'mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400'

export function AuthGoogleButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-full items-center justify-center gap-3 rounded-lg border border-slate-200/90 bg-white text-[13px] font-medium text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:border-slate-300 hover:bg-slate-50/90 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M21.35 11.1H12v2.9h5.35c-.24 1.5-.98 2.77-2.09 3.62v3h3.38c1.98-1.83 3.11-4.53 3.11-7.72 0-.74-.07-1.45-.2-2.13Z"
            fill="#4285F4"
          />
          <path
            d="M12 22c2.7 0 4.96-.89 6.61-2.38l-3.38-3c-.94.63-2.14 1-3.23 1-2.48 0-4.6-1.67-5.35-3.93H3.2v3.06C4.82 19.98 8.12 22 12 22Z"
            fill="#34A853"
          />
          <path
            d="M6.65 13.69C6.46 13.06 6.35 12.39 6.35 11.7c0-.68.12-1.35.3-1.98V6.66H3.2C2.58 7.9 2.25 9.27 2.25 10.7c0 1.44.33 2.8.95 4.04l3.45-1.05Z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.34c1.47 0 2.78.51 3.82 1.5l2.86-2.86C17 2.89 14.7 2 12 2 8.12 2 4.82 4.02 3.2 6.66l3.45 3.06C7.4 7.01 9.52 5.34 12 5.34Z"
            fill="#EA4335"
          />
        </svg>
      </span>
      {label}
    </button>
  )
}

export function AuthPrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative h-10 w-full overflow-hidden rounded-lg bg-slate-900 text-[14px] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_14px_-2px_rgba(15,23,42,0.35)] transition-all duration-200 hover:bg-slate-950 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12),0_8px_24px_-4px_rgba(15,23,42,0.45)] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-disabled:opacity-0"
        style={{
          background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.08) 50%, transparent 65%)',
        }}
      />
      <span className="relative">{children}</span>
    </button>
  )
}

type SegOpt = { id: string; label: string }

export function AuthSegmented({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (id: string) => void
  options: [SegOpt, SegOpt]
}) {
  const isSecond = value === options[1].id
  return (
    <div className="relative flex h-10 rounded-full bg-slate-200/80 p-1 ring-1 ring-slate-200/50">
      <motion.div
        className="absolute inset-y-1 left-1 z-0 w-[calc(50%-4px)] rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]"
        initial={false}
        animate={{ x: isSecond ? 'calc(100% + 4px)' : 0 }}
        transition={{ type: 'spring', stiffness: 440, damping: 34 }}
      />
      <button
        type="button"
        onClick={() => onChange(options[0].id)}
        className={`relative z-[1] flex-1 rounded-full py-2 text-[13px] font-medium transition-colors ${
          !isSecond ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {options[0].label}
      </button>
      <button
        type="button"
        onClick={() => onChange(options[1].id)}
        className={`relative z-[1] flex-1 rounded-full py-2 text-[13px] font-medium transition-colors ${
          isSecond ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {options[1].label}
      </button>
    </div>
  )
}
