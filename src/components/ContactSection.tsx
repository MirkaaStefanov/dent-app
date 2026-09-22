import React from 'react';
import { WorkingHour } from '@/types/database';
import { MapPin, Phone, Mail, ExternalLink } from 'lucide-react';

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
    <section id="contacts" className="py-16 sm:py-24 border-b border-purple-100/80 bg-[#faf8fc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-12 sm:mb-16 space-y-3">
          <span className="text-xs font-bold text-purple-700 uppercase tracking-widest block">
            Контакти &middot; Търговище
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-slate-900 tracking-tight">
            Контакти и работно време
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-normal">
            Кабинетът се намира на лесно и комуникативно място в центъра на града.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 max-w-5xl mx-auto items-start">
          
          {/* Left Column: Coordinates */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-purple-100 p-7 sm:p-9 space-y-6 shadow-lg shadow-purple-900/5">
            
            <div className="space-y-1">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block">
                Адрес на практиката
              </span>
              <p className="text-base sm:text-lg font-bold text-slate-900">
                гр. Търговище
              </p>
              <p className="text-sm text-slate-600">
                бул. „Васил Левски“ №12, ет. 2, каб. 4 (до паркинг)
              </p>
              <div className="pt-2">
                <a
                  href="https://maps.google.com/?q=бул.+Васил+Левски+12+Търговище"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-800 hover:text-purple-950 underline"
                >
                  <span>Отворете в Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="pt-4 border-t border-purple-50 space-y-1">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block">
                Телефон за контакт
              </span>
              <a
                href="tel:+359888123456"
                className="text-lg sm:text-xl font-extrabold text-purple-900 hover:text-purple-700 block transition-colors"
              >
                088 812 3456
              </a>
              <p className="text-xs text-slate-500">
                Приемът е с предварително записан час
              </p>
            </div>

            <div className="pt-4 border-t border-purple-50 space-y-1">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block">
                Имейл
              </span>
              <a
                href="mailto:dr.ayaz.dent@gmail.com"
                className="text-sm font-semibold text-slate-800 hover:text-purple-800 block transition-colors"
              >
                dr.ayaz.dent@gmail.com
              </a>
            </div>

          </div>

          {/* Right Column: Working Hours Schedule */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-purple-100 p-7 sm:p-9 shadow-lg shadow-purple-900/5 space-y-5">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block">
              График на кабинета
            </span>

            <div className="divide-y divide-purple-50 text-sm">
              {sortedHours.map((wh) => (
                <div key={wh.id} className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    {wh.day_name}
                  </span>
                  <span className={wh.is_working ? 'font-bold text-purple-900' : 'text-slate-400'}>
                    {wh.is_working ? `${wh.start_time} – ${wh.end_time} ч.` : 'Почивен ден'}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500 pt-2">
              * За спешни случаи извън графика, моля позвънете директно на обявения телефон.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
