'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
            GELSİN<span className="text-blue-600">.</span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            <Link href="/#nasil-calisir" className="px-3 py-2 rounded-lg font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-sm">
              Nasıl Çalışır?
            </Link>
            <Link href="/#kategoriler" className="px-3 py-2 rounded-lg font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-sm">
              Kategoriler
            </Link>
            <Link href="/register?role=provider" className="px-3 py-2 rounded-lg font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-sm">
              Uzman Ol
            </Link>
            <div className="w-px h-6 bg-slate-200 mx-2" />
            <Link href="/login" className="px-4 py-2 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors text-sm">
              Giriş Yap
            </Link>
            <Link href="/register" className="px-4 py-2 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors text-sm">
              Kayıt Ol
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menü"
          >
            <Menu className="h-5 w-5 text-slate-700" />
          </button>
        </div>

        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="md:hidden pb-4 flex flex-col gap-2"
          >
            <Link href="/#nasil-calisir" className="px-4 py-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100" onClick={() => setMobileOpen(false)}>Nasıl Çalışır?</Link>
            <Link href="/#kategoriler" className="px-4 py-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100" onClick={() => setMobileOpen(false)}>Kategoriler</Link>
            <Link href="/register?role=provider" className="px-4 py-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100" onClick={() => setMobileOpen(false)}>Uzman Ol</Link>
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="flex-1 py-3 rounded-xl text-center text-sm font-semibold border border-slate-200 text-slate-700" onClick={() => setMobileOpen(false)}>Giriş Yap</Link>
              <Link href="/register" className="flex-1 py-3 rounded-xl text-center text-sm font-bold bg-slate-900 text-white" onClick={() => setMobileOpen(false)}>Kayıt Ol</Link>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  )
}
