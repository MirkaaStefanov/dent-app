import React from 'react';
import { WorkingHour } from '@/types/database';
import { ExternalLink } from 'lucide-react';

interface ContactSectionProps {
  workingHours: WorkingHour[];
}

export default function ContactSection({ workingHours }: ContactSectionProps) {
  const sortedHours = [...workingHours].sort((a, b) => {
    const orderA = a.day_of_week === 0 ? 7 : a.day_of_week;
    const orderB = b.day_of_week === 0 ? 7 : b.day_of_week;
    return orderA - orderB;
  });

  return (
    <section id="contacts" className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="max-w-xl mb-12 sm:mb-16">
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 tracking-tight mb-3">
            Контакти и работно време
          </h2>
          <p className="text-base text-slate-500">
            Кабинетът се намира на лесно достъпно място в центъра на града.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">

          {/* Contact info */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-7 space-y-5">

            <div className="space-y-1">
              <span className="text-sm font-medium text-slate-400 block">Адрес</span>
              <p className="text-base font-semibold text-slate-900">
                гр. Търговище
              </p>
              <p className="text-sm text-slate-500">
                бул. „Васил Левски“ №12, ет. 2, каб. 4
              </p>
              <a
                href="https://maps.google.com/?q=бул.+Васил+Левски+12+Търговище"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-purple-700 hover:text-purple-900 mt-1"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="pt-4 border-t border-gray-200 space-y-1">
              <span className="text-sm font-medium text-slate-400 block">Телефон</span>
              <a
                href="tel:+359888123456"
                className="text-lg font-semibold text-slate-900 hover:text-purple-800 transition-colors block"
              >
                088 812 3456
              </a>
              <p className="text-xs text-slate-400">
                Приемът е с предварително записан час
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200 space-y-1">
              <span className="text-sm font-medium text-slate-400 block">Имейл</span>
              <a
                href="mailto:dr.ayaz.dent@gmail.com"
                className="text-sm text-slate-700 hover:text-purple-800 transition-colors block"
              >
                dr.ayaz.dent@gmail.com
              </a>
            </div>

          </div>

          {/* Working hours */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-7 space-y-4">
            <span className="text-sm font-medium text-slate-400 block">Работно време</span>

            <div className="divide-y divide-gray-200 text-sm">
              {sortedHours.map((wh) => (
                <div key={wh.id} className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-700">
                    {wh.day_name}
                  </span>
                  <span className={wh.is_working ? 'font-medium text-slate-900' : 'text-slate-400'}>
                    {wh.is_working ? `${wh.start_time} – ${wh.end_time}` : 'Почивен ден'}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-400 pt-1">
              * При спешност извън работно време, моля позвънете.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
