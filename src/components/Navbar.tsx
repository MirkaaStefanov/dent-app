'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ClinicBrand from './ClinicBrand';
import { Menu, X, Phone, Calendar, UserRound } from 'lucide-react';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo — text only */}
          <ClinicBrand />

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link href="/#services" className="text-sm text-slate-600 hover:text-purple-800 transition-colors">
              Услуги
            </Link>
            <Link href="/#about" className="text-sm text-slate-600 hover:text-purple-800 transition-colors">
              За кабинета
            </Link>
            <Link href="/#contacts" className="text-sm text-slate-600 hover:text-purple-800 transition-colors">
              Контакти
            </Link>
            <Link href="/moite-rezervacii" className="text-sm text-slate-600 hover:text-purple-800 transition-colors">
              Моите часове
            </Link>
          </nav>

          {/* Desktop right: phone + CTA */}
          <div className="hidden lg:flex items-center gap-5">
            <a
              href="tel:+359888123456"
              className="text-sm text-slate-600 hover:text-purple-800 transition-colors flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>088 812 3456</span>
            </a>
            <Link
              href="/zapisi-chas"
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-purple-800 hover:bg-purple-900 text-white text-sm font-semibold transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Запазете час</span>
            </Link>
            <Link href="/vhod" aria-label="Вход за пациенти" className="p-2 rounded-full border border-purple-100 text-purple-800 hover:bg-purple-50 transition-colors">
              <UserRound className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile: call + hamburger */}
          <div className="flex items-center gap-2 lg:hidden">
            <a
              href="tel:+359888123456"
              className="p-2 rounded-full text-purple-800 hover:bg-purple-50 transition-colors"
              aria-label="Обаждане по телефон"
            >
              <Phone className="w-5 h-5" />
            </a>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-full text-slate-700 hover:bg-gray-50 transition-colors"
              aria-label="Навигационно меню"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-5 py-5 space-y-4">
          <nav id="mobile-navigation" className="flex flex-col space-y-3">
            <Link
              href="/#services"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base text-slate-700 hover:text-purple-800 py-1"
            >
              Услуги
            </Link>
            <Link
              href="/#about"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base text-slate-700 hover:text-purple-800 py-1"
            >
              За кабинета
            </Link>
            <Link
              href="/#contacts"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base text-slate-700 hover:text-purple-800 py-1"
            >
              Контакти
            </Link>
            <Link
              href="/moite-rezervacii"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base text-slate-700 hover:text-purple-800 py-1"
            >
              Моите часове
            </Link>
          </nav>

          <div className="pt-3 border-t border-gray-100 flex flex-col gap-3">
            <Link
              href="/zapisi-chas"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full text-center py-3 rounded-xl bg-purple-800 hover:bg-purple-900 text-white font-semibold text-sm transition-colors"
            >
              Запазете час онлайн
            </Link>
            <a
              href="tel:+359888123456"
              className="w-full text-center py-2.5 rounded-xl border border-gray-200 text-slate-700 font-semibold text-sm"
            >
              Обаждане: 088 812 3456
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
