'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Phone, Calendar } from 'lucide-react';

function ToothIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2C8.5 2 6 4.5 6 8c0 3 1.2 5.5 2 8.5.8 3 1.5 5.5 4 5.5s3.2-2.5 4-5.5c.8-3 2-5.5 2-8.5 0-3.5-2.5-6-6-6z" />
      <path d="M9.5 9c.8-.8 1.6-1.2 2.5-1.2s1.7.4 2.5 1.2" />
    </svg>
  );
}

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#faf8fc]/95 backdrop-blur-md border-b border-purple-100/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo / Doctor Identity with Purple Accent */}
          <Link href="/" className="group flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center border border-purple-200/80 group-hover:bg-purple-800 group-hover:text-white transition-all shadow-xs">
              <ToothIcon className="w-5 h-5" />
            </div>

            <div className="flex flex-col">
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-slate-900 group-hover:text-purple-800 transition-colors">
                Д-р Джанел Аяз
              </span>
              <span className="text-xs text-purple-700 tracking-wider uppercase font-semibold">
                Стоматологичен кабинет &middot; Търговище
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/#services" 
              className="text-sm font-semibold text-slate-700 hover:text-purple-800 transition-colors"
            >
              Услуги и цени
            </Link>
            <Link 
              href="/#about" 
              className="text-sm font-semibold text-slate-700 hover:text-purple-800 transition-colors"
            >
              За кабинета
            </Link>
            <Link 
              href="/#contacts" 
              className="text-sm font-semibold text-slate-700 hover:text-purple-800 transition-colors"
            >
              Контакти
            </Link>
          </nav>

          {/* Desktop Right: Phone & Signature Purple CTA */}
          <div className="hidden md:flex items-center gap-6">
            <a
              href="tel:+359888123456"
              className="text-sm font-bold text-purple-900 hover:text-purple-700 transition-colors flex items-center gap-1.5"
            >
              <Phone className="w-4 h-4 text-purple-700" />
              <span>088 812 3456</span>
            </a>
            <Link
              href="/zapisi-chas"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-purple-800 hover:bg-purple-900 text-white text-sm font-bold shadow-md shadow-purple-900/20 transition-all active:scale-98"
            >
              <Calendar className="w-4 h-4" />
              <span>Запазете час</span>
            </Link>
          </div>

          {/* Mobile Right: Call Icon + Hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <a
              href="tel:+359888123456"
              className="p-2.5 rounded-full text-purple-800 bg-purple-50 hover:bg-purple-100 transition-colors"
              aria-label="Обаждане по телефон"
            >
              <Phone className="w-5 h-5" />
            </a>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 rounded-full text-slate-800 hover:bg-purple-50 transition-colors"
              aria-label="Навигационно меню"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-purple-100 bg-[#faf8fc] px-5 py-6 space-y-4 animate-in fade-in duration-150">
          <nav className="flex flex-col space-y-3">
            <Link
              href="/#services"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-semibold text-slate-800 hover:text-purple-800 py-1"
            >
              Услуги и цени
            </Link>
            <Link
              href="/#about"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-semibold text-slate-800 hover:text-purple-800 py-1"
            >
              За кабинета
            </Link>
            <Link
              href="/#contacts"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-semibold text-slate-800 hover:text-purple-800 py-1"
            >
              Контакти
            </Link>
          </nav>

          <div className="pt-4 border-t border-purple-100 flex flex-col gap-3">
            <Link
              href="/zapisi-chas"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full text-center py-3 rounded-xl bg-purple-800 hover:bg-purple-900 text-white font-bold text-sm shadow-md shadow-purple-900/15 transition-all"
            >
              Запазете час онлайн
            </Link>
            <a
              href="tel:+359888123456"
              className="w-full text-center py-2.5 rounded-xl border border-purple-200 text-purple-900 font-bold text-sm transition-all"
            >
              Обаждане: 088 812 3456
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
