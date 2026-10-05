'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Service, Appointment, DayOff } from '@/types/database';
import { getServices, getAvailableSlots, addAppointment, getDaysOff } from '@/lib/storage';
import { initialServices } from '@/lib/data/initialData';
import { formatBulgarianDate } from '@/lib/notifications';
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Sun, 
  Sunset,
  MapPin,
  ChevronLeft,
  CalendarPlus,
  Download
} from 'lucide-react';
import InteractiveCalendar from '@/components/InteractiveCalendar';

type StepNumber = 1 | 2 | 3;

function downloadIcs(apt: Appointment) {
  const startClean = `${apt.date.replace(/-/g, '')}T${apt.start_time.replace(/:/g, '')}00`;
  const endClean = `${apt.date.replace(/-/g, '')}T${apt.end_time.replace(/:/g, '')}00`;
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dr Djanel Ayaz//Dental Clinic//BG',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `SUMMARY:Стоматолог - ${apt.service_title}`,
    `DESCRIPTION:Час за стоматолог при Д-р Джанел Аяз. Адрес: гр. Търговище, бул. Васил Левски 12, каб. 4. Телефон: 088 812 3456.`,
    `LOCATION:бул. Васил Левски 12, каб. 4, гр. Търговище`,
    `DTSTART:${startClean}`,
    `DTEND:${endClean}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chas-dr-ayaz-${apt.date}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function BookingWizardContent() {
  const searchParams = useSearchParams();
  const preselectedServiceId = searchParams.get('service');

  const todayStr = new Date().toISOString().split('T')[0];

  const [services, setServices] = useState<Service[]>(initialServices);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [daysOff, setDaysOff] = useState<DayOff[]>([]);

  // Form inputs
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Booked appointment
  const [bookedAppointment, setBookedAppointment] = useState<Appointment | null>(null);

  // Load services and days off
  useEffect(() => {
    async function load() {
      try {
        const [fetchedServices, fetchedDaysOff] = await Promise.all([
          getServices(),
          getDaysOff(),
        ]);
        if (fetchedDaysOff) {
          setDaysOff(fetchedDaysOff);
        }
        if (fetchedServices.length > 0) {
          setServices(fetchedServices);
          if (preselectedServiceId) {
            const match = fetchedServices.find((s) => s.id === preselectedServiceId);
            if (match) {
              setSelectedService(match);
              setCurrentStep(2);
              return;
            }
          }
          setSelectedService(fetchedServices[0]);
        }
      } catch (err) {
        console.error('Failed to load services or days off:', err);
      }
    }
    load();
  }, [preselectedServiceId]);

  // Load slots when date or service changes
  useEffect(() => {
    async function loadSlots() {
      if (!selectedService || !selectedDate) return;
      setIsLoadingSlots(true);
      setUnavailableReason(null);
      setSelectedSlot(null);

      try {
        const result = await getAvailableSlots(selectedDate, selectedService.duration_minutes);
        setAvailableSlots(result.slots);
        if (result.reason) {
          setUnavailableReason(result.reason);
        }
      } catch (err) {
        console.error('Failed to load slots:', err);
        setUnavailableReason('Грешка при проверка на графика.');
      } finally {
        setIsLoadingSlots(false);
      }
    }
    loadSlots();
  }, [selectedDate, selectedService]);

  // Generate 7-day quick buttons starting today with weekend and vacation flags
  const quickDates = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() + idx);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    const dayNames = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const matchingDayOff = daysOff.find((doff) => dateStr >= doff.start_date && dateStr <= doff.end_date);
    return {
      dateStr,
      dayName: idx === 0 ? 'Днес' : idx === 1 ? 'Утре' : dayNames[d.getDay()],
      dayNumber: d.getDate(),
      monthNumber: d.getMonth() + 1,
      isWeekend,
      dayOff: matchingDayOff,
    };
  });

  // Morning vs afternoon slots
  const morningSlots = availableSlots.filter((slot) => {
    const hour = parseInt(slot.split(':')[0], 10);
    return hour < 13;
  });

  const afternoonSlots = availableSlots.filter((slot) => {
    const hour = parseInt(slot.split(':')[0], 10);
    return hour >= 13;
  });

  const handleSelectServiceAndNext = (service: Service) => {
    setSelectedService(service);
    setCurrentStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedSlot) return;
    if (!patientName.trim() || !patientPhone.trim()) {
      alert('Моля, попълнете име и телефон за връзка.');
      return;
    }

    setIsSubmitting(true);
    try {
      const [h, m] = selectedSlot.split(':').map(Number);
      const totalMinutes = h * 60 + m + selectedService.duration_minutes;
      const endH = Math.floor(totalMinutes / 60);
      const endM = totalMinutes % 60;
      const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      const newApt = await addAppointment({
        service_id: selectedService.id,
        service_title: selectedService.title,
        service_duration: selectedService.duration_minutes,
        service_price: selectedService.price_bgn,
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim(),
        patient_email: patientEmail.trim() || undefined,
        date: selectedDate,
        start_time: selectedSlot,
        end_time: endTimeStr,
        status: 'confirmed',
        notes: patientNotes.trim() || undefined,
        booked_by: 'patient',
      });

      setBookedAppointment(newApt);
    } catch (err) {
      console.error('Error booking:', err);
      alert('Възникна грешка при запазването. Моля, позвънете на 088 812 3456.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setBookedAppointment(null);
    setCurrentStep(1);
    setSelectedSlot(null);
    setPatientName('');
    setPatientPhone('');
    setPatientEmail('');
    setPatientNotes('');
  };

  // ─────────────────────────────────────────────────────────────
  // SUCCESS SCREEN
  // ─────────────────────────────────────────────────────────────
  if (bookedAppointment) {
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `Стоматолог: ${bookedAppointment.service_title}`
    )}&dates=${bookedAppointment.date.replace(/-/g, '')}T${bookedAppointment.start_time.replace(/:/g, '')}00/${bookedAppointment.date.replace(/-/g, '')}T${bookedAppointment.end_time.replace(/:/g, '')}00&details=${encodeURIComponent(
      `Стоматологичен кабинет на Д-р Джанел Аяз, гр. Търговище, бул. Васил Левски 12, каб. 4. Тел: 088 812 3456`
    )}&location=${encodeURIComponent(
      `бул. Васил Левски 12, каб. 4, гр. Търговище`
    )}`;

    return (
      <div className="max-w-xl mx-auto py-10 sm:py-16">
        <div className="bg-white rounded-3xl border border-purple-100 p-8 sm:p-10 shadow-lg shadow-purple-900/5 text-center space-y-6">
          
          <div className="w-14 h-14 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block">
              Потвърдено посещение
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
              Вашият час е запазен
            </h2>
            <p className="text-sm text-slate-600">
              Очакваме Ви в кабинета на Д-р Джанел Аяз в гр. Търговище.
            </p>
          </div>

          <div className="bg-purple-50/60 rounded-2xl p-5 text-left space-y-3 border border-purple-100 text-sm">
            <div className="flex items-center justify-between border-b border-purple-100/80 pb-2">
              <span className="text-slate-500">Процедура:</span>
              <span className="font-bold text-slate-900 text-right">{bookedAppointment.service_title}</span>
            </div>
            <div className="flex items-center justify-between border-b border-purple-100/80 pb-2">
              <span className="text-slate-500">Дата:</span>
              <span className="font-bold text-purple-900">{formatBulgarianDate(bookedAppointment.date)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-purple-100/80 pb-2">
              <span className="text-slate-500">Час:</span>
              <span className="font-bold text-purple-900">
                {bookedAppointment.start_time} – {bookedAppointment.end_time} ч.
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-purple-100/80 pb-2">
              <span className="text-slate-500">Пациент:</span>
              <span className="font-medium text-slate-900">{bookedAppointment.patient_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Цена:</span>
              <span className="font-extrabold text-purple-950 text-base">{bookedAppointment.service_price} €</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-purple-50/40 rounded-2xl p-4 text-left border border-purple-100">
            <MapPin className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">бул. „Васил Левски“ №12, ет. 2, каб. 4</span>
              <span>гр. Търговище &middot; За въпроси: 088 812 3456</span>
            </div>
          </div>

          {/* Calendar integration options */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-1/2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-purple-200 hover:border-purple-300 bg-white text-purple-900 font-bold text-xs sm:text-sm transition-colors"
            >
              <CalendarPlus className="w-4 h-4 text-purple-700" />
              <span>Добави в Google Calendar</span>
            </a>
            <button
              type="button"
              onClick={() => downloadIcs(bookedAppointment)}
              className="w-full sm:w-1/2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-purple-200 hover:border-purple-300 bg-white text-purple-900 font-bold text-xs sm:text-sm transition-colors"
            >
              <Download className="w-4 h-4 text-purple-700" />
              <span>Свали за Apple / Outlook</span>
            </button>
          </div>

          <div className="pt-4 border-t border-purple-50 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3 px-4 rounded-full bg-purple-800 hover:bg-purple-900 text-white font-bold text-sm shadow-md shadow-purple-900/15 transition-colors"
            >
              Запазете друг час
            </button>
            <Link
              href="/"
              className="block w-full py-2 text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors"
            >
              &larr; Към началната страница
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-12">
      
      {/* Top Breadcrumb / Back button */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-purple-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Обратно към сайта</span>
        </Link>
        <a
          href="tel:+359888123456"
          className="text-xs font-bold text-purple-800 hover:text-purple-950 flex items-center gap-1"
        >
          <Phone className="w-3.5 h-3.5 text-purple-700" />
          <span>088 812 3456</span>
        </a>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-3xl border border-purple-100 p-5 sm:p-9 shadow-lg shadow-purple-900/5">
        
        {/* Header */}
        <div className="mb-8 text-center space-y-1">
          <span className="text-xs font-bold text-purple-700 uppercase tracking-widest block">
            Д-р Джанел Аяз &middot; Търговище
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
            Записване на час
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Изберете процедура, свободен час и въведете вашите данни.
          </p>
        </div>

        {/* Step Segmented Control with Purple Highlights */}
        <div className="mb-8">
          <div className="grid grid-cols-3 gap-1 bg-purple-50 p-1 rounded-2xl mb-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
                currentStep === 1
                  ? 'bg-purple-800 text-white shadow-xs'
                  : currentStep > 1
                  ? 'text-purple-900 hover:bg-white/60'
                  : 'text-slate-400'
              }`}
            >
              1. Услуга
            </button>

            <button
              type="button"
              disabled={!selectedService}
              onClick={() => selectedService && setCurrentStep(2)}
              className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
                currentStep === 2
                  ? 'bg-purple-800 text-white shadow-xs'
                  : currentStep > 2
                  ? 'text-purple-900 hover:bg-white/60'
                  : 'text-slate-400 disabled:cursor-not-allowed'
              }`}
            >
              2. Дата & Час
            </button>

            <button
              type="button"
              disabled={!selectedSlot}
              onClick={() => selectedSlot && setCurrentStep(3)}
              className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
                currentStep === 3
                  ? 'bg-purple-800 text-white shadow-xs'
                  : 'text-slate-400 disabled:cursor-not-allowed'
              }`}
            >
              3. Данни
            </button>
          </div>
        </div>

        {/* Selected Service pill when in step 2 or 3 */}
        {currentStep > 1 && selectedService && (
          <div className="mb-6 p-3.5 bg-purple-50/80 border border-purple-100 rounded-2xl flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700 min-w-0">
              <span className="font-bold text-purple-900 shrink-0">Избрана процедура:</span>
              <span className="truncate font-medium">{selectedService.title}</span>
              <span className="shrink-0 font-extrabold text-purple-900">({selectedService.price_bgn} €)</span>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-purple-700 hover:text-purple-950 font-bold underline shrink-0"
            >
              Смяна
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 1: SERVICE */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div>
            <div className="mb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                1. Изберете процедура:
              </h2>
              <p className="text-xs text-slate-500">
                Натиснете върху желаната манипулация, за да видите свободните часове.
              </p>
            </div>

            <div className="space-y-2.5">
              {services
                .filter((s) => s.is_active)
                .map((service) => {
                  const isSelected = selectedService?.id === service.id;
                  return (
                    <div
                      key={service.id}
                      onClick={() => handleSelectServiceAndNext(service)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-purple-700 bg-purple-50/80 ring-1 ring-purple-700'
                          : 'border-slate-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          {service.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-purple-600" />
                            {service.duration_minutes} мин.
                          </span>
                          {service.category && (
                            <span className="text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                              {service.category}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <span className="block text-base font-extrabold text-purple-950">
                          {service.price_bgn} €
                        </span>
                        <span className="text-xs font-bold text-purple-700 flex items-center gap-0.5 justify-end mt-0.5">
                          <span>Избери</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {selectedService && (
              <div className="mt-6 pt-4 border-t border-purple-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-purple-800 hover:bg-purple-900 text-white text-sm font-bold shadow-md shadow-purple-900/15 transition-all"
                >
                  <span>Продължи към дата и час</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 2: DATE & TIME */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div>
            <div className="mb-5">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                2. Изберете ден и свободен час:
              </h2>
              <p className="text-xs text-slate-500">
                Времетраене на процедурата: {selectedService?.duration_minutes} мин.
              </p>
            </div>

            {/* ИНТЕРАКТИВЕН МЕСЕЧЕН КАЛЕНДАР */}
            <div className="mb-6">
              <InteractiveCalendar
                selectedDate={selectedDate}
                onSelectDate={(d) => setSelectedDate(d)}
                minDate={todayStr}
                variant="booking"
                title="Календар на кабинета"
                daysOff={daysOff}
              />
            </div>

            {/* Бърз избор на ден */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider mb-2.5">
                Бърз избор на ден:
              </label>
              
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
                {quickDates.map((item) => {
                  const isSelected = selectedDate === item.dateStr;
                  return (
                    <button
                      key={item.dateStr}
                      type="button"
                      onClick={() => setSelectedDate(item.dateStr)}
                      title={
                        item.dayOff
                          ? `Почивен ден / Отпуск: ${item.dayOff.reason}`
                          : item.isWeekend
                          ? 'Уикенд (събота/неделя)'
                          : undefined
                      }
                      className={`p-3 rounded-2xl text-center transition-all flex flex-col items-center justify-center border-2 shrink-0 w-19 sm:w-22 relative overflow-hidden cursor-pointer ${
                        isSelected
                          ? 'bg-linear-to-r from-purple-700 to-violet-800 text-white border-purple-800 shadow-md shadow-purple-900/15 scale-[1.02] z-10'
                          : item.dayOff
                          ? 'bg-rose-50/90 text-rose-950 border-rose-300 hover:border-rose-400 hover:bg-rose-100/80 shadow-2xs'
                          : item.isWeekend
                          ? 'bg-amber-50/80 text-amber-950 border-amber-200 hover:border-amber-300 hover:bg-amber-100/80 shadow-2xs'
                          : 'bg-white text-purple-950 border-purple-100 hover:border-purple-300 hover:bg-purple-50/40'
                      }`}
                    >
                      {/* SVG Cross-Hatch for Day Off in Quick Dates */}
                      {item.dayOff && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-rose-400/50" preserveAspectRatio="none">
                          <line x1="0" y1="0" x2="100%" y2="100%" strokeWidth="1.5" strokeDasharray="3 2" />
                          <line x1="100%" y1="0" x2="0" y2="100%" strokeWidth="1.5" strokeDasharray="3 2" />
                        </svg>
                      )}
                      <div className="flex items-center gap-1 leading-none z-10 relative">
                        <span
                          className={`text-[11px] font-extrabold ${
                            isSelected
                              ? 'text-purple-200'
                              : item.dayOff
                              ? 'text-rose-900'
                              : item.isWeekend
                              ? 'text-amber-900'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.dayName}
                        </span>
                        {item.dayOff ? (
                          <span className="text-[10px]">🏖️</span>
                        ) : item.isWeekend ? (
                          <span className="text-[10px]">☀️</span>
                        ) : null}
                      </div>
                      <span
                        className={`text-lg font-black mt-0.5 z-10 relative ${
                          isSelected
                            ? 'text-white'
                            : item.dayOff
                            ? 'text-rose-950'
                            : item.isWeekend
                            ? 'text-amber-950'
                            : 'text-slate-900'
                        }`}
                      >
                        {item.dayNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold z-10 relative ${
                          isSelected
                            ? 'text-purple-200'
                            : item.dayOff
                            ? 'text-rose-700'
                            : item.isWeekend
                            ? 'text-amber-700'
                            : 'text-slate-400'
                        }`}
                      >
                        .{String(item.monthNumber).padStart(2, '0')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots Area */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider mb-3">
                Свободни часове за {formatBulgarianDate(selectedDate)}:
              </label>

              {isLoadingSlots ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  <div className="inline-block w-5 h-5 border-2 border-purple-800 border-t-transparent rounded-full animate-spin mb-2" />
                  <p>Проверка на графика...</p>
                </div>
              ) : unavailableReason ? (
                (() => {
                  const matchingDayOff = daysOff.find(
                    (d) => selectedDate >= d.start_date && selectedDate <= d.end_date
                  );
                  const selDateObj = new Date(selectedDate);
                  const selDayOfWeek = (selDateObj.getDay() + 6) % 7;
                  const isWeekend = selDayOfWeek === 5 || selDayOfWeek === 6;

                  if (matchingDayOff) {
                    return (
                      <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-5 text-center text-rose-950 shadow-sm space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto text-2xl shadow-2xs border border-rose-200">
                          🏖️
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-200/80 px-2.5 py-0.5 rounded-full inline-block mb-1">
                            Обявен период на отпуск / почивен ден
                          </span>
                          <h4 className="font-extrabold text-sm sm:text-base text-rose-950">
                            Кабинетът не приема часове за тази дата
                          </h4>
                          <p className="text-xs font-bold text-rose-900 mt-1">
                            Основание: {matchingDayOff.reason}
                          </p>
                          <p className="text-[11px] text-rose-700/80 mt-0.5">
                            Период: {formatBulgarianDate(matchingDayOff.start_date)} –{' '}
                            {formatBulgarianDate(matchingDayOff.end_date)}
                          </p>
                        </div>
                        <p className="text-xs text-rose-800/80 pt-2 border-t border-rose-200/60 max-w-sm mx-auto">
                          Моля, изберете свободен ден от календара по-горе, за да видите наличните часове.
                        </p>
                      </div>
                    );
                  }

                  if (isWeekend) {
                    return (
                      <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 text-center text-amber-950 shadow-sm space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-2xl shadow-2xs border border-amber-200">
                          ☀️
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-200/80 px-2.5 py-0.5 rounded-full inline-block mb-1">
                            Почивен ден за кабинета
                          </span>
                          <h4 className="font-extrabold text-sm sm:text-base text-amber-950">
                            Събота и неделя са почивни дни
                          </h4>
                          <p className="text-xs text-amber-900 mt-1 max-w-sm mx-auto">
                            Работното време на Д-р Джанел Аяз е от понеделник до петък (09:00 – 18:00 ч.). Моля, изберете делничен ден за преглед.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center text-amber-800 text-xs">
                      <p className="font-bold mb-1">Денят не е наличен</p>
                      <p>{unavailableReason}</p>
                    </div>
                  );
                })()
              ) : availableSlots.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center text-slate-600 text-xs">
                  <p className="font-bold mb-1">Няма свободни часове за тази дата</p>
                  <p className="text-slate-500">
                    Моля, изберете друг ден от календара или позвънете на 088 812 3456.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {morningSlots.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span>Сутрин (09:00 – 13:00)</span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {morningSlots.map((slot) => {
                          const isSlotSelected = selectedSlot === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-2.5 px-1 text-xs sm:text-sm font-bold rounded-xl border transition-all text-center ${
                                isSlotSelected
                                  ? 'bg-purple-800 text-white border-purple-800 shadow-md shadow-purple-900/20'
                                  : 'bg-white text-slate-800 border-slate-200 hover:border-purple-300'
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {afternoonSlots.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        <Sunset className="w-3.5 h-3.5 text-purple-600" />
                        <span>Следобед (14:00 – 18:00)</span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {afternoonSlots.map((slot) => {
                          const isSlotSelected = selectedSlot === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-2.5 px-1 text-xs sm:text-sm font-bold rounded-xl border transition-all text-center ${
                                isSlotSelected
                                  ? 'bg-purple-800 text-white border-purple-800 shadow-md shadow-purple-900/20'
                                  : 'bg-white text-slate-800 border-slate-200 hover:border-purple-300'
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-purple-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-slate-600 hover:text-purple-900 py-2 px-3 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Назад</span>
              </button>

              <button
                type="button"
                disabled={!selectedSlot}
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 sm:py-3 rounded-full bg-purple-800 hover:bg-purple-900 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-900/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Продължи към данни</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 3: CONTACT DETAILS */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                3. Въведете вашите данни:
              </h2>
              <p className="text-xs text-slate-500">
                За да запишем часа и да изпратим напомняне.
              </p>
            </div>

            {/* Recap Box */}
            <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-4 mb-5 text-xs sm:text-sm">
              <div className="flex items-center justify-between border-b border-purple-100 pb-2 mb-2">
                <span className="text-slate-500">Процедура:</span>
                <span className="font-bold text-slate-900 text-right">{selectedService?.title}</span>
              </div>
              <div className="flex items-center justify-between border-b border-purple-100 pb-2 mb-2">
                <span className="text-slate-500">Дата и час:</span>
                <span className="font-bold text-purple-900">
                  {formatBulgarianDate(selectedDate)} в {selectedSlot} ч.
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Ориентировъчна цена:</span>
                <span className="font-extrabold text-purple-950 text-sm">{selectedService?.price_bgn} €</span>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="patient-name" className="block text-xs font-bold text-slate-700 mb-1">
                  Име и фамилия <span className="text-purple-600">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="patient-name"
                    autoComplete="name"
                    required
                    placeholder="Иван Петров"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="patient-phone" className="block text-xs font-bold text-slate-700 mb-1">
                  Телефон за връзка <span className="text-purple-600">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    id="patient-phone"
                    autoComplete="tel"
                    required
                    placeholder="088 123 4567"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Ще получите напомняне по Viber/SMS преди посещението.
                </span>
              </div>

              <div>
                <label htmlFor="patient-email" className="block text-xs font-bold text-slate-700 mb-1">
                  Имейл <span className="text-slate-400 font-normal">(по желание)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    id="patient-email"
                    autoComplete="email"
                    placeholder="ivan@example.com"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="patient-notes" className="block text-xs font-bold text-slate-700 mb-1">
                  Бележка <span className="text-slate-400 font-normal">(по желание)</span>
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
                  <textarea
                    id="patient-notes"
                    rows={2}
                    placeholder="Опишете оплакване или симптоми..."
                    value={patientNotes}
                    onChange={(e) => setPatientNotes(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-600 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-purple-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-slate-600 hover:text-purple-900 py-2 px-3 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Назад</span>
              </button>

              <button
                type="submit"
                disabled={!patientName.trim() || !patientPhone.trim() || isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-purple-800 hover:bg-purple-900 text-white text-sm font-bold shadow-md shadow-purple-900/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>Запазване...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Потвърди и запази час</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <main className="min-h-screen bg-[#faf8fc] px-4">
      <Suspense fallback={
        <div className="max-w-md mx-auto py-20 text-center text-purple-800">
          <div className="inline-block w-6 h-6 border-2 border-purple-800 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs font-semibold">Зареждане на графика...</p>
        </div>
      }>
        <BookingWizardContent />
      </Suspense>
    </main>
  );
}
