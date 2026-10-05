'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Service } from '@/types/database';
import { Clock, ArrowRight } from 'lucide-react';

interface ServicesSectionProps {
  services: Service[];
  onSelectService?: (service: Service) => void;
}

export default function ServicesSection({ services }: ServicesSectionProps) {
  const activeServices = services.filter((service) => service.is_active);

  const [category, setCategory] = useState('Всички');
  const categories = ['Всички', ...new Set(activeServices.map(s => s.category || 'Дентална грижа'))];
  const visibleServices = category === 'Всички' ? activeServices : activeServices.filter(s => (s.category || 'Дентална грижа') === category);

  return (
    <section className="py-16 sm:py-24 bg-[#FAFAFD] border-b border-purple-50" id="services">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Heading */}
        <div className="max-w-2xl mb-12 sm:mb-16">
          <span className="text-xs font-semibold text-purple-700 uppercase tracking-widest block mb-2">
            Ценоразпис · Търговище
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 tracking-tight mb-3">
            Услуги и прозрачни цени
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Открийте подходящата грижа за Вашата усмивка. Цената и планът за лечение се уточняват при прегледа.
          </p>
        </div>

        <div className="service-filters" aria-label="Категории услуги">{categories.map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
        {/* Services grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 flex flex-col justify-between hover:border-purple-300 hover:shadow-lg hover:shadow-purple-950/5 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="text-xs font-semibold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                    {service.category || 'Дентална грижа'}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    ~{service.duration_minutes} мин.
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 leading-snug group-hover:text-purple-900 transition-colors">
                  {service.title}
                </h3>

                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  {service.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Ориентировъчна цена
                  </span>
                  <span className="text-xl font-bold text-slate-900">
                    {service.price_bgn} €
                  </span>
                </div>

                <Link
                  href={`/zapisi-chas?service=${service.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-50 hover:bg-purple-800 text-purple-800 hover:text-white text-xs font-semibold transition-all active:scale-98"
                >
                  <span>Запази час</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
