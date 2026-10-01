import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check } from 'lucide-react';

export default function AboutSection() {
  return (
    <section className="py-16 sm:py-24 bg-white border-b border-purple-50" id="about">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

          {/* Left: Text & Values (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="text-xs font-semibold text-purple-700 uppercase tracking-widest block mb-2">
                За кабинета · Търговище
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 tracking-tight leading-snug">
                Дентална грижа, изградена върху спокойствие и прецизност.
              </h2>
            </div>

            <div className="space-y-4 text-base text-slate-600 leading-relaxed font-normal">
              <p>
                Кабинетът на Д-р Джанел Аяз в гр. Търговище е създаден с ясна цел — да осигури модерно зъболечение в предвидима и спокойна среда. Вярваме, че доброто лечение започва с внимателно изслушване и уважение към времето на всеки пациент.
              </p>
              <p>
                Работим изцяло с предварителен час, което изключва чакането в коридорите. Всяка процедура се обяснява подробно на достъпен език, а за пълен комфорт прилагаме контактен обезболяващ гел преди поставянето на локалната упойка.
              </p>
              <p>
                Особено внимание отделяме на децата и пациентите с дентална тревожност, осигурявайки плавен, безболезнен и спокоен престой на стоматологичния стол.
              </p>
            </div>

            {/* Standards */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Индивидуален стерилен сет</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Щадяща контактна упойка</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Съвременни материали</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Спокоен подход към деца</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/zapisi-chas"
                className="inline-flex items-center gap-2 text-sm font-semibold text-purple-800 hover:text-purple-950 transition-colors"
              >
                <span>Запазете Вашия час за преглед онлайн</span>
                <ArrowRight className="w-4 h-4 text-purple-700" />
              </Link>
            </div>
          </div>

          {/* Right: Interior Image + Quote (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="relative rounded-3xl overflow-hidden border border-purple-100 shadow-xl shadow-purple-950/5 aspect-[4/3] w-full bg-purple-50">
              <Image
                src="/images/clinic-interior.jpg"
                alt="Интериор на стоматологичния кабинет на Д-р Джанел Аяз в Търговище"
                fill
                className="object-cover object-center"
              />
            </div>

            <div className="bg-purple-50/70 rounded-2xl border border-purple-100/80 p-6 sm:p-7">
              <blockquote className="font-serif text-base sm:text-lg text-slate-800 italic leading-relaxed mb-3">
                „Здравата усмивка изисква прецизност към всеки детайл. Когато пациентът знае какво му предстои и не изпитва болка, посещението при стоматолог се превръща в спокойна рутина.“
              </blockquote>
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-bold text-slate-900">
                  Д-р Джанел Аяз
                </span>
                <span className="text-purple-700 font-medium">
                  Лекар по дентална медицина
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
