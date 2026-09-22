import Link from 'next/link';
import { Calendar, Phone, MapPin, Clock, ArrowRight, Check } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative py-14 sm:py-20 lg:py-28 border-b border-purple-100/80 bg-[#faf8fc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Editorial Headline & Actions */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-left">
            
            <div className="space-y-3">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-widest block">
                Дентална практика &middot; гр. Търговище
              </span>
              <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal text-slate-900 tracking-tight leading-[1.15]">
                Спокойна и безболезнена дентална грижа.
              </h1>
            </div>

            <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-xl">
              В кабинета на бул. „Васил Левски“ №12 съчетаваме съвременни методи на лечение, щадяща анестезия и спокойна среда без бързане.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Link
                href="/zapisi-chas"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-purple-800 hover:bg-purple-900 text-white font-bold text-sm sm:text-base shadow-md shadow-purple-900/20 transition-all active:scale-98"
              >
                <Calendar className="w-4 h-4" />
                <span>Запазете час онлайн</span>
              </Link>

              <a
                href="tel:+359888123456"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border border-purple-200 hover:border-purple-300 bg-white text-purple-950 hover:bg-purple-50/50 font-bold text-sm sm:text-base transition-colors"
              >
                <Phone className="w-4 h-4 text-purple-700" />
                <span>088 812 3456</span>
              </a>
            </div>

            {/* Reassuring Clinical Points with Purple Accents */}
            <div className="pt-6 border-t border-purple-100 flex flex-wrap gap-x-8 gap-y-3 text-xs sm:text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Щадяща упойка без болка</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Индивидуален час без чакане</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Фиксирани цени в евро (€)</span>
              </div>
            </div>

          </div>

          {/* Right Column: Clean Practice Information Plaque */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl border border-purple-100 p-7 sm:p-9 shadow-lg shadow-purple-900/5 space-y-6">
              
              <div className="space-y-1 pb-5 border-b border-purple-50">
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block">
                  Стоматологичен кабинет
                </span>
                <h2 className="font-serif text-2xl font-bold text-slate-900">
                  Д-р Джанел Аяз
                </h2>
                <p className="text-xs text-slate-500">
                  Лекар по дентална медицина &middot; Член на БЗС
                </p>
              </div>

              <div className="space-y-4 text-sm text-slate-600">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">гр. Търговище</span>
                    <span className="text-xs text-slate-500">бул. „Васил Левски“ №12, ет. 2, каб. 4 (до паркинг)</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Понеделник – Петък</span>
                    <span className="text-xs text-slate-500">09:00 – 18:00 ч. (прием с предварително записан час)</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">088 812 3456</span>
                    <span className="text-xs text-slate-500">Автоматично напомняне по Viber/SMS преди часа</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/zapisi-chas"
                  className="w-full inline-flex items-center justify-between p-3.5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs sm:text-sm font-bold transition-colors"
                >
                  <span>Вижте свободните часове в календара</span>
                  <ArrowRight className="w-4 h-4 text-purple-700" />
                </Link>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
