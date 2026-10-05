'use client';

import React, { useState, useEffect } from 'react';
import { Service, Appointment, DayOff } from '@/types/database';
import { getAvailableSlots, addAppointment, getDaysOff } from '@/lib/storage';
import { formatBulgarianDate } from '@/lib/notifications';
import confetti from 'canvas-confetti';
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
  MapPin
} from 'lucide-react';
import InteractiveCalendar from '@/components/InteractiveCalendar';

interface BookingSectionProps {
  services: Service[];
  selectedService: Service | null;
  onSelectService: (service: Service) => void;
}

type StepNumber = 1 | 2 | 3;

export default function BookingSection({
  services,
  selectedService,
  onSelectService,
}: BookingSectionProps) {
  const todayStr = new Date().toISOString().split('T')[0];

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

  // Load days off
  useEffect(() => {
    async function loadDaysOff() {
      try {
        const fetched = await getDaysOff();
        if (fetched) {
          setDaysOff(fetched);
        }
      } catch (err) {
        console.error('Failed to load days off:', err);
      }
    }
    loadDaysOff();
  }, []);

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

  // Next 7 days for quick date swipe with weekend and vacation flags
  const quickDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayNames = ['Нед', 'Пон', 'Вто', 'Сря', 'Чет', 'Пет', 'Съб'];
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const matchingDayOff = daysOff.find((doff) => dateStr >= doff.start_date && dateStr <= doff.end_date);
    return {
      dateStr,
      dayName: i === 0 ? 'Днес' : i === 1 ? 'Утре' : dayNames[d.getDay()],
      dayNumber: d.getDate(),
      monthNumber: d.getMonth() + 1,
      isWeekend,
      dayOff: matchingDayOff,
    };
  });

  const morningSlots = availableSlots.filter((slot) => {
    const hour = parseInt(slot.split(':')[0], 10);
    return hour < 13;
  });

  const afternoonSlots = availableSlots.filter((slot) => {
    const hour = parseInt(slot.split(':')[0], 10);
    return hour >= 13;
  });

  const handleSelectServiceAndNext = (service: Service) => {
    onSelectService(service);
    setCurrentStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedSlot) return;
    if (!patientName.trim() || !patientPhone.trim()) {
      alert('Моля, попълнете Вашето име и телефонен номер.');
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

      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#7e22ce', '#a855f7', '#c084fc', '#3b82f6'],
        });
      } catch {
        // Confetti safe fallback
      }
    } catch (err) {
      console.error('Error booking:', err);
      alert('Възникна грешка при запазването. Моля, опитайте отново или позвънете на 088 812 3456.');
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
    return (
      <section id="booking" className="py-12 sm:py-20 scroll-mt-16 bg-purple-50/40">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-white rounded-3xl border border-purple-200/80 p-6 sm:p-8 shadow-md text-center">
            
            <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold mb-2">
              Успешно записване
            </span>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
              Вашият час е потвърден!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-6">
              Очакваме Ви в кабинета на Д-р Джанел Аяз в Търговище.
            </p>

            {/* Recap Card */}
            <div className="bg-purple-50/60 rounded-2xl p-4 text-left space-y-2.5 border border-purple-100 text-xs sm:text-sm mb-6">
              <div className="flex items-center justify-between border-b border-purple-100/80 pb-2">
                <span className="text-slate-500">Процедура:</span>
                <span className="font-bold text-slate-900 text-right">{bookedAppointment.service_title}</span>
              </div>
              <div className="flex items-center justify-between border-b border-purple-100/80 pb-2">
                <span className="text-slate-500">Дата:</span>
                <span className="font-bold text-purple-800">{formatBulgarianDate(bookedAppointment.date)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-purple-100/80 pb-2">
                <span className="text-slate-500">Час:</span>
                <span className="font-bold text-purple-800">
                  {bookedAppointment.start_time} – {bookedAppointment.end_time} ч.
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-purple-100/80 pb-2">
                <span className="text-slate-500">Пациент:</span>
                <span className="font-semibold text-slate-900">{bookedAppointment.patient_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Цена:</span>
                <span className="font-extrabold text-slate-900 text-base">{bookedAppointment.service_price} €</span>
              </div>
            </div>

            {/* Location Note */}
            <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 rounded-xl p-3 mb-6 text-left">
              <MapPin className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <span>
                <strong>Адрес:</strong> гр. Търговище, бул. „Васил Левски“ №12, каб. 4 · 088 812 3456
              </span>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm shadow-sm transition-colors"
            >
              Запазете друг час
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MOBILE-FIRST WIZARD
  // ─────────────────────────────────────────────────────────────
  return (
    <section id="booking" className="py-12 sm:py-20 scroll-mt-16 bg-linear-to-b from-white via-purple-50/30 to-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        
        {/* Section Heading */}
        <div className="text-center mb-6 sm:mb-8">
          <span className="text-xs sm:text-sm font-bold text-purple-700 tracking-wider uppercase block mb-1.5">
            Онлайн график 24/7
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Запазете час за 1 минута
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Изберете процедура, удобен час и въведете вашите данни.
          </p>
        </div>

        {/* Wizard Main Card */}
        <div className="bg-white rounded-3xl border border-purple-100 p-4 sm:p-8 shadow-xs">
          
          {/* Step Segmented Control / Progress Bar */}
          <div className="mb-6">
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl mb-2.5">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
                  currentStep === 1
                    ? 'bg-purple-700 text-white shadow-xs'
                    : currentStep > 1
                    ? 'text-purple-800 hover:bg-white/60'
                    : 'text-slate-500'
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
                    ? 'bg-purple-700 text-white shadow-xs'
                    : currentStep > 2
                    ? 'text-purple-800 hover:bg-white/60'
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
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-slate-400 disabled:cursor-not-allowed'
                }`}
              >
                3. Данни
              </button>
            </div>

            {/* Micro Progress Line */}
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
              <div 
                className="bg-purple-700 h-full transition-all duration-300 rounded-full"
                style={{ width: currentStep === 1 ? '33.3%' : currentStep === 2 ? '66.6%' : '100%' }}
              />
            </div>
          </div>

          {/* Active Selection Summary Pill (Shown when on Step 2 or 3) */}
          {currentStep > 1 && selectedService && (
            <div className="mb-5 p-3 bg-purple-50 border border-purple-100 rounded-2xl flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700 min-w-0">
                <span className="font-bold text-purple-900 shrink-0">Услуга:</span>
                <span className="truncate font-medium">{selectedService.title}</span>
                <span className="shrink-0 text-slate-500 font-bold">({selectedService.price_bgn} €)</span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-purple-700 hover:text-purple-900 font-bold underline shrink-0 text-xs"
              >
                Смяна
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* STEP 1: SELECT SERVICE (NO INNER SCROLLBOX FOR PHONE TOUCH!) */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div>
              <div className="mb-3.5">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Изберете процедура:
                </h3>
                <p className="text-xs text-slate-500">
                  Натиснете върху желаната услуга, за да продължите.
                </p>
              </div>

              {/* Natural flow - no trapped scrolling */}
              <div className="space-y-2">
                {services
                  .filter((s) => s.is_active)
                  .map((service) => {
                    const isSelected = selectedService?.id === service.id;
                    return (
                      <div
                        key={service.id}
                        onClick={() => handleSelectServiceAndNext(service)}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/80 ring-1 ring-purple-600'
                            : 'border-slate-200 bg-white hover:border-purple-200 active:bg-purple-50/40'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className={`text-sm sm:text-base font-bold ${isSelected ? 'text-purple-900' : 'text-slate-900'}`}>
                            {service.title}
                          </h4>
                          <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-purple-600" />
                              {service.duration_minutes} мин.
                            </span>
                            {service.category && (
                              <span className="text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                {service.category}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <span className="block text-base font-extrabold text-slate-900">
                            {service.price_bgn} €
                          </span>
                          <span className="text-[11px] font-bold text-purple-700 flex items-center gap-0.5 justify-end mt-1">
                            <span>Избери</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {selectedService && (
                <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white text-sm font-bold shadow-sm transition-all"
                  >
                    <span>Продължи към дата и час</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* STEP 2: SELECT DATE AND TIME (SWIPEABLE HORIZONTAL STRIP) */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div>
              <div className="mb-4">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Изберете ден и свободен час:
                </h3>
                <p className="text-xs text-slate-500">
                  Показват се часове с продължителност {selectedService?.duration_minutes} мин.
                </p>
              </div>

              {/* ИНТЕРАКТИВЕН МЕСЕЧЕН КАЛЕНДАР */}
              <div className="mb-5">
                <InteractiveCalendar
                  selectedDate={selectedDate}
                  onSelectDate={(d) => setSelectedDate(d)}
                  minDate={todayStr}
                  variant="booking"
                  title="Календар за избор на дата"
                  daysOff={daysOff}
                />
              </div>

              {/* Horizontal Scrollable Days Strip on Mobile (Отдолу както е сега) */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">
                  Бърз избор на ден:
                </label>
                
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none">
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

                {/* Calendar picker for later dates */}
                <div className="mt-2.5 flex items-center gap-2 bg-purple-50/70 p-2.5 rounded-2xl border border-purple-200 text-xs">
                  <Calendar className="w-4 h-4 text-purple-700 shrink-0" />
                  <span className="text-purple-950 font-bold">Друга дата:</span>
                  <input
                    type="date"
                    min={todayStr}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-white px-2.5 py-1 text-xs border border-purple-200 rounded-xl text-purple-950 font-medium focus:outline-hidden focus:ring-2 focus:ring-purple-600 ml-auto"
                  />
                </div>
              </div>

              {/* Time Slots Area */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider mb-2.5">
                  2. Изберете час за {formatBulgarianDate(selectedDate)}:
                </label>

                {isLoadingSlots ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    <div className="inline-block w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-1.5" />
                    <p>Зареждане на графика...</p>
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
                        <p className="font-bold mb-1">Денят не е наличен за записване</p>
                        <p>{unavailableReason}</p>
                        <p className="mt-1 text-slate-500">Моля, плъзнете и изберете друг работен ден от бутоните горе.</p>
                      </div>
                    );
                  })()
                ) : availableSlots.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center text-slate-600 text-xs">
                    <p className="font-bold mb-1">Няма свободни часове за тази дата</p>
                    <p className="text-slate-500">
                      Всички часове са заети. Моля, изберете следващ ден или позвънете на 088 812 3456.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* Morning */}
                    {morningSlots.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                          <span>Сутрешни часове (09:00 – 13:00)</span>
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
                                    ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                                    : 'bg-white text-slate-800 border-slate-200 hover:border-purple-300 active:bg-purple-50'
                                }`}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Afternoon */}
                    {afternoonSlots.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                          <Sunset className="w-3.5 h-3.5 text-purple-500" />
                          <span>Следобедни часове (14:00 – 18:00)</span>
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
                                    ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                                    : 'bg-white text-slate-800 border-slate-200 hover:border-purple-300 active:bg-purple-50'
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

              {/* Navigation buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Назад</span>
                </button>

                <button
                  type="button"
                  disabled={!selectedSlot}
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white text-xs sm:text-sm font-bold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Продължи кьм данни</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* STEP 3: PATIENT DETAILS & CONFIRMATION */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Потвърждение и контакт
                </h3>
                <p className="text-xs text-slate-500">
                  Въведете име и телефон, за да запишем часа.
                </p>
              </div>

              {/* Booking Summary Box */}
              <div className="bg-purple-50/80 border border-purple-100 rounded-2xl p-3.5 sm:p-4 mb-5 text-xs sm:text-sm">
                <div className="flex items-center justify-between border-b border-purple-100/80 pb-2 mb-2">
                  <span className="text-slate-500">Процедура:</span>
                  <span className="font-bold text-slate-900 text-right">{selectedService?.title}</span>
                </div>
                <div className="flex items-center justify-between border-b border-purple-100/80 pb-2 mb-2">
                  <span className="text-slate-500">Дата и час:</span>
                  <span className="font-bold text-purple-800">
                    {formatBulgarianDate(selectedDate)} в {selectedSlot} ч.
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Ориентировъчна цена:</span>
                  <span className="font-extrabold text-slate-900 text-sm sm:text-base">{selectedService?.price_bgn} €</span>
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-3.5 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Име и фамилия <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Иван Петров"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Телефон за връзка <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="088 123 4567"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Ще получите потвърждение и напомняне преди часа.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Имейл <span className="text-slate-400 font-normal">(по желание)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="ivan@example.com"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Бележка / оплакване <span className="text-slate-400 font-normal">(по желание)</span>
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <textarea
                      rows={2}
                      placeholder="Опишете оплакване или симптоми..."
                      value={patientNotes}
                      onChange={(e) => setPatientNotes(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-600 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Назад</span>
                </button>

                <button
                  type="submit"
                  disabled={!patientName.trim() || !patientPhone.trim() || isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white text-sm font-bold shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
    </section>
  );
}
