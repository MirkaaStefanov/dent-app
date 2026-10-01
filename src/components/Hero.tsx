import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Phone, Check } from 'lucide-react';

export default function Hero() {
  return (
    <section className="py-12 sm:py-20 lg:py-24 bg-white border-b border-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

          {/* Left: Editorial Headline & Actions (7 cols) */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-800 text-xs font-semibold border border-purple-100">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                Стоматологичен кабинет · гр. Търговище
              </span>
              <h1 className="font-serif text-3xl sm:text-5xl lg:text-[52px] font-normal text-slate-900 tracking-tight leading-[1.15]">
                Спокойна и безболезнена дентална грижа.
              </h1>
            </div>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              В кабинета на Д-р Джанел Аяз на бул. „Васил Левски“ съчетаваме съвременни методи на лечение, щадяща анестезия и предвидима среда без бързане.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Link
                href="/zapisi-chas"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-purple-800 hover:bg-purple-900 text-white font-semibold text-sm transition-all shadow-md shadow-purple-950/10 active:scale-98"
              >
                <Calendar className="w-4 h-4" />
                <span>Запазете час онлайн</span>
              </Link>

              <a
                href="tel:+359888123456"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border border-slate-200 hover:border-purple-300 text-slate-800 hover:text-purple-900 font-semibold text-sm transition-colors bg-white"
              >
                <Phone className="w-4 h-4 text-purple-700" />
                <span>088 812 3456</span>
              </a>
            </div>

            {/* Reassuring Clinical Points */}
            <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-2.5 text-xs sm:text-sm text-slate-600">
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

          {/* Right: Real Clinic Photograph (5 cols) */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl overflow-hidden border border-purple-100 shadow-xl shadow-purple-950/5 bg-purple-50">
              <div className="relative aspect-[4/3] sm:aspect-[4/3] lg:aspect-[4/5] w-full">
                <Image
                  src="/images/dentist-hero.jpg"
                  alt="Д-р Джанел Аяз в стоматологичния кабинет в Търговище"
                  fill
                  className="object-cover object-center"
                  priority
                />
              </div>

              {/* Floating doctor badge */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-purple-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="font-serif text-base font-bold text-slate-900 block leading-tight">
                    Д-р Джанел Аяз
                  </span>
                  <span className="text-xs text-purple-800 font-medium">
                    Лекар по дентална медицина · Търговище
                  </span>
                </div>
                <Link
                  href="/zapisi-chas"
                  className="text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-full transition-colors shrink-0"
                >
                  График →
                </Link>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
