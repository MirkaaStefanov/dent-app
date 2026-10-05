'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'Боли ли поставянето на упойка и самото лечение?',
    a: 'Комфортът е индивидуален. По време на прегледа обсъждаме подходящото обезболяване и какво да очаквате. Ако изпитвате тревожност, споделете я предварително.',
  },
  {
    q: 'В каква валута са обявени цените?',
    a: 'Цените са показани в евро (€) и са ориентировъчни. Конкретната стойност зависи от необходимото лечение и се уточнява при прегледа.',
  },
  {
    q: 'Как се записва час през сайта?',
    a: 'Процесът отнема по-малко от минута: избирате желаната процедура от списъка, посочвате удобен ден и час от интерактивния календар и въвеждате име и телефон. Часът се запазва директно в графика на кабинета.',
  },
  {
    q: 'Има ли възможност за паркиране до кабинета?',
    a: 'Да. Кабинетът се намира на бул. „Васил Левски" №12, ет. 2, каб. 4. В непосредствена близост до входа има удобни места за паркиране.',
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
    <section id="faq" className="py-16 sm:py-24 bg-gray-50/50">
      <div className="clinic-container faq-grid">

        {/* Header */}
        <div className="faq-intro">
          <span className="eyebrow">ПРЕДИ ПОСЕЩЕНИЕТО</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 tracking-tight mb-3">
            Често задавани въпроси
          </h2>
          <p className="text-base text-slate-500">
            Малко повече яснота. Малко по-малко притеснение.
          </p>
          <Link href="/zapisi-chas" className="clinic-text-link">Запазете час →</Link>
        </div>
        <div>
        {/* FAQ Accordion */}
        <div className="divide-y divide-gray-200">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className="py-5">
                <button
                  type="button"
                  className="w-full flex items-center justify-between text-left focus:outline-hidden group"
                  onClick={() => toggleFaq(index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  id={`faq-question-${index}`}
                >
                  <span className={`text-base font-medium transition-colors pr-4 ${isOpen ? 'text-purple-800' : 'text-slate-900 group-hover:text-purple-700'}`}>
                    {faq.q}
                  </span>
                  <div className={`text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180 text-purple-600' : ''}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
                {isOpen && (
                  <div id={`faq-answer-${index}`} role="region" aria-labelledby={`faq-question-${index}`} className="pt-3 text-sm text-slate-500 leading-relaxed pr-8">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contact hint */}
        <div className="mt-10 text-sm text-slate-400">
          Имате друг въпрос? Обадете се на{' '}
          <a href="tel:+359888123456" className="text-purple-700 font-medium hover:text-purple-900">
            088 812 3456
          </a>
        </div>

        </div>
      </div>
    </section>
  );
}
