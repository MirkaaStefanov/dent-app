'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'Боли ли поставянето на упойка и самото лечение?',
    a: 'Категорично не. Преди поставянето на анестезията, зоната се третира с локален обезболяващ гел. Така убождането не се усеща, а манипулацията протича в пълен комфорт и спокойствие.',
  },
  {
    q: 'В каква валута са обявени цените?',
    a: 'Всички цени в ценоразписа са фиксирани в евро (€) за пълна прозрачност. Преди всяка процедура получавате точна крайна цена без изненади.',
  },
  {
    q: 'Как се записва час през сайта?',
    a: 'Процесът отнема по-малко от минута: избирате желаната процедура от списъка, посочвате удобен ден и час от интерактивния календар и въвеждате име и телефон. Часът се запазва директно в графика на кабинета.',
  },
  {
    q: 'Има ли възможност за паркиране до кабинета?',
    a: 'Да. Кабинетът се намира на бул. „Васил Левски“ №12, ет. 2, каб. 4. В непосредствена близост до входа има удобни места за паркиране.',
  },
  {
    q: 'Работите ли с деца?',
    a: 'Да, Д-р Джанел Аяз посреща деца с много търпение и спокоен подход, за да изградят доверие и да посещават зъболекаря без страх.',
  },
];

export default function ReviewsAndFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-16 sm:py-24 border-b border-purple-100/80 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 space-y-3">
          <span className="text-xs font-bold text-purple-700 uppercase tracking-widest block">
            Въпроси & Отговори
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 tracking-tight">
            Често задавани въпроси
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-normal">
            Информация за Вашето посещение при Д-р Джанел Аяз.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="divide-y divide-purple-100 border-y border-purple-100">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className={`py-5 transition-colors ${isOpen ? 'bg-purple-50/30 px-3 rounded-2xl' : ''}`}>
                <button
                  type="button"
                  className="w-full flex items-center justify-between text-left focus:outline-hidden group"
                  onClick={() => toggleFaq(index)}
                  aria-expanded={isOpen}
                >
                  <span className={`text-base font-bold transition-colors pr-4 ${isOpen ? 'text-purple-900' : 'text-slate-900 group-hover:text-purple-800'}`}>
                    {faq.q}
                  </span>
                  <div className={`p-1 rounded-full text-purple-600 transition-transform ${isOpen ? 'rotate-180 text-purple-800' : ''}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
                {isOpen && (
                  <div className="pt-3 text-sm text-slate-600 leading-relaxed font-normal">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Discreet Contact Hint */}
        <div className="mt-10 text-center text-xs sm:text-sm text-slate-500">
          Имате друг въпрос? Свържете се с кабинета на{' '}
          <a href="tel:+359888123456" className="text-purple-800 font-bold underline hover:text-purple-950">
            088 812 3456
          </a>
        </div>

      </div>
    </section>
  );
}
