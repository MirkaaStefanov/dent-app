import React from 'react';
import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';

export default function AboutSection() {
  return (
    <section className="py-16 sm:py-24 border-b border-purple-100/80 bg-[#faf8fc]" id="about">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Doctor & Practice Philosophy */}
          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-widest block">
              За кабинета &middot; Търговище
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 tracking-tight leading-snug">
              Дентална грижа, изградена върху спокойствие, търпение и прецизност.
            </h2>
            
            <div className="space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              <p>
                Кабинетът на Д-р Джанел Аяз в гр. Търговище е създаден с ясна цел — да осигури модерно зъболечение в предвидима и спокойна среда. Вярваме, че доброто лечение започва с изслушване и уважение към времето на пациента.
              </p>
              <p>
                Работим с предварителен час, което изключва чакането в коридорите. Всяка процедура се обяснява предварително, а за максимален комфорт прилагаме локален обезболяващ гел преди поставянето на упойката.
              </p>
              <p>
                Особено внимание отделяме на децата и пациентите с дентална тревожност, осигурявайки плавен и безболезнен престой на стоматологичния стол.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/zapisi-chas"
                className="inline-flex items-center gap-2 text-sm font-bold text-purple-800 hover:text-purple-950 transition-colors"
              >
                <span>Запазете Вашия час за преглед</span>
                <ArrowRight className="w-4 h-4 text-purple-700" />
              </Link>
            </div>
          </div>

          {/* Right Column: Doctor Commitment Plaque with Soft Purple Styling */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white rounded-3xl border border-purple-100 p-7 sm:p-9 shadow-lg shadow-purple-900/5 space-y-6">
              <blockquote className="font-serif text-lg sm:text-xl text-purple-950 italic leading-relaxed">
                „Здравата и красива усмивка изисква внимание към всеки детайл. Когато пациентът знае какво му предстои и не изпитва болка, посещението при стоматолог се превръща в спокойна рутина.“
              </blockquote>

              <div className="pt-4 border-t border-purple-50 flex items-center justify-between">
                <div>
                  <span className="block font-bold text-slate-900 text-base">
                    Д-р Джанел Аяз
                  </span>
                  <span className="block text-xs text-purple-700 font-semibold">
                    Лекар по дентална медицина &middot; гр. Търговище
                  </span>
                </div>
              </div>
            </div>

            {/* Clean Medical Standards with Purple Accents */}
            <div className="p-6 rounded-3xl bg-purple-50/60 border border-purple-100 space-y-3">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block">
                Клинични стандарти:
              </span>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>Щадяща упойка с контактен обезболяващ гел</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>Кофердам изолация при пломби и коренови лечения</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>Автоклав клас B с индивидуален стерилен комплект</span>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
