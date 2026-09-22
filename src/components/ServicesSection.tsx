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

  const categories = [
    'Всички',
    'Профилактика',
    'Терапия',
    'Естетика',
    'Детска стоматология',
  ];

  const [activeCategory, setActiveCategory] = useState('Всички');

  const filteredServices = activeServices.filter((s) => {
    if (activeCategory === 'Всички') return true;
    if (activeCategory === 'Профилактика') {
      return (
        s.category?.includes('Профилактика') ||
        s.category?.includes('Хигиена') ||
        s.title.toLowerCase().includes('преглед') ||
        s.title.toLowerCase().includes('камък')
      );
    }
    if (activeCategory === 'Терапия') {
      return (
        s.category?.includes('Терапия') ||
        s.category?.includes('Ендодонтия') ||
        s.title.toLowerCase().includes('кариес') ||
        s.title.toLowerCase().includes('кореново') ||
        s.title.toLowerCase().includes('обтурация') ||
        s.title.toLowerCase().includes('пломба')
      );
    }
    if (activeCategory === 'Естетика') {
      return (
        s.category?.includes('Естетика') ||
        s.title.toLowerCase().includes('избелване')
      );
    }
    if (activeCategory === 'Детска стоматология') {
      return (
        s.category?.includes('Детска') ||
        s.title.toLowerCase().includes('детск')
      );
    }
    return true;
  });

  return (
    <section className="py-16 sm:py-24 border-b border-purple-100/80 bg-white" id="services">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="max-w-2xl mx-auto text-center mb-12 sm:mb-16 space-y-3">
          <span className="text-xs font-bold text-purple-700 uppercase tracking-widest block">
            Ценоразпис &middot; Търговище
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 tracking-tight">
            Услуги и прозрачни цени
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
            Всички манипулации се извършват с включена локална упойка и висок клас материали. Без скрити такси.
          </p>
        </div>

        {/* Minimalist Category Tabs with Purple Accents */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
                activeCategory === cat
                  ? 'bg-purple-800 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-[#faf8fc] rounded-2xl border border-purple-100 p-6 flex flex-col justify-between hover:border-purple-300 hover:shadow-lg hover:shadow-purple-900/5 transition-all"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="text-purple-700 font-semibold">{service.category || 'Дентална грижа'}</span>
                  <span className="flex items-center gap-1 font-medium text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    {service.duration_minutes} мин.
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 leading-snug">
                  {service.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  {service.description}
                </p>
              </div>

              <div className="pt-4 border-t border-purple-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Цена
                  </span>
                  <span className="text-xl font-extrabold text-purple-950">
                    {service.price_bgn} €
                  </span>
                </div>

                <Link
                  href={`/zapisi-chas?service=${service.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold transition-all active:scale-98 shadow-xs"
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
