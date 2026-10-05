'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import styles from './booking.module.css';
import { useSearchParams } from 'next/navigation';
import { Service, Appointment, DayOff, WorkingHour } from '@/types/database';
import { getServices, getAvailableSlots, addAppointment, getDaysOff, getWorkingHours } from '@/lib/storage';
import { initialServices, initialWorkingHours } from '@/lib/data/initialData';
import { formatBulgarianDate } from '@/lib/notifications';
import { 
  CheckCircle2, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
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
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>(initialWorkingHours);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [daysOff, setDaysOff] = useState<DayOff[]>([]);

  // Form inputs
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [notificationConsent, setNotificationConsent] = useState(false);
  const [patientEmail, setPatientEmail] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Booked appointment
  const [bookedAppointment, setBookedAppointment] = useState<Appointment | null>(null);

  // Load services and days off
  useEffect(() => {
    async function load() {
      try {
        const [fetchedServices, fetchedDaysOff, fetchedWorkingHours] = await Promise.all([
          getServices(),
          getDaysOff(),
          getWorkingHours(),
        ]);
        setWorkingHours(fetchedWorkingHours);
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
    let active = true;
    async function loadSlots() {
      if (!selectedService || !selectedDate) return;
      setIsLoadingSlots(true);
      setUnavailableReason(null);
      setSelectedSlot(null);

      try {
        const result = await getAvailableSlots(selectedDate, selectedService.duration_minutes);
        if (!active) return;
        setAvailableSlots(result.slots);
        if (result.reason) {
          setUnavailableReason(result.reason);
        }
      } catch (err) {
        console.error('Failed to load slots:', err);
        if (active) setUnavailableReason('Грешка при проверка на графика.');
      } finally {
        if (active) setIsLoadingSlots(false);
      }
    }
    void loadSlots();
    return () => { active = false; };
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
    setBookingError(null);
    try {
      const latest = await getAvailableSlots(selectedDate, selectedService.duration_minutes);
      if (!latest.slots.includes(selectedSlot)) {
        setAvailableSlots(latest.slots);
        setUnavailableReason(latest.reason || null);
        setSelectedSlot(null);
        setCurrentStep(2);
        setBookingError('Този час вече не е наличен. Моля, изберете друг свободен час.');
        return;
      }
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
        notification_consent: notificationConsent,
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
      alert(err instanceof Error ? err.message : 'Възникна грешка при запазването. Моля, позвънете на 088 812 3456.');
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
    <div className={styles.layout}>
      <aside className={styles.aside}>
        <Link href="/" className={styles.brand}>Д-р Джанел Аяз</Link>
        <span className="eyebrow">ВАШЕТО ПОСЕЩЕНИЕ</span>
        <h2>Първата стъпка<br />към по-здрава<br /><em>усмивка.</em></h2>
        <p>Изберете удобен час. Ние ще отделим време за Вашите въпроси и за грижата, от която имате нужда.</p>
        <ol><li><span>01</span><div><strong>Изберете услуга</strong><small>Или започнете с първичен преглед</small></div></li><li><span>02</span><div><strong>Намерете удобен час</strong><small>Вижте наличните дни в календара</small></div></li><li><span>03</span><div><strong>Оставете данни за връзка</strong><small>Прегледайте избора си и потвърдете</small></div></li></ol>
        <a href="tel:+359888123456" className={styles.help}><Phone size={18} /><span>Нужда от съдействие?<strong>088 812 3456</strong></span></a>
      </aside>
      <div className={styles.formArea}>
      
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
      <div className={`${styles.card} bg-white rounded-3xl border border-purple-100 p-5 sm:p-9 shadow-lg shadow-purple-900/5`}>
        
        {/* Header */}
        <div className={styles.formHeading}>
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
          <div className={styles.stepNavigation}>
            <button
              type="button"
              aria-current={currentStep === 1 ? 'step' : undefined}
              onClick={() => setCurrentStep(1)}
              className={styles.stepButton}
            >
              1. Услуга
            </button>

            <button
              type="button"
              aria-current={currentStep === 2 ? 'step' : undefined}
              disabled={!selectedService}
              onClick={() => selectedService && setCurrentStep(2)}
              className={styles.stepButton}
            >
              2. Дата & Час
            </button>

            <button
              type="button"
              aria-current={currentStep === 3 ? 'step' : undefined}
              disabled={!selectedSlot}
              onClick={() => selectedSlot && setCurrentStep(3)}
              className={styles.stepButton}
            >
              3. Данни
            </button>
          </div>
        </div>

        {bookingError && <p role="alert" className={styles.error}>{bookingError}</p>}
        {currentStep > 1 && selectedService && <div className={styles.selectedService}><div><span>ИЗБРАНА УСЛУГА</span><strong>{selectedService.title}</strong></div><div><span>{selectedService.price_bgn} €</span><button type="button" onClick={() => setCurrentStep(1)}>Промени</button></div></div>}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 1: SERVICE */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div>
            <div className="mb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Изберете подходящата грижа
              </h2>
              <p className="text-xs text-slate-500">
                Натиснете върху желаната манипулация, за да видите свободните часове.
              </p>
            </div>

            <div className={styles.serviceChoices}>
              {services
                .filter((s) => s.is_active)
                .map((service) => {
                  const isSelected = selectedService?.id === service.id;
                  return (
                    <button
                      type="button"
                      key={service.id}
                      aria-label={`Изберете ${service.title}`}
                      aria-pressed={isSelected}
                      onClick={() => handleSelectServiceAndNext(service)}
                      className={styles.serviceChoice}
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base font-medium text-slate-900">
                          {service.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium mt-1">
                          <span className="flex items-center gap-1 whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5 text-purple-600" />
                            {service.duration_minutes} мин.
                          </span>
                          {service.category && (
                            <span className="text-slate-400 text-[11px] font-normal">
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
                    </button>
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
                Кога Ви е удобно?
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
                isDateDisabled={(_dateStr, mondayIndex) => !workingHours.find(hour => hour.day_of_week === (mondayIndex + 1) % 7)?.is_working}
              />
            </div>

            <div className={styles.quickDates} role="group" aria-label="Бърз избор на дата">{quickDates.map(item => {
              const weekday = new Date(`${item.dateStr}T12:00:00`).getDay();
              const disabled = Boolean(item.dayOff) || !workingHours.find(hour => hour.day_of_week === weekday)?.is_working;
              return <button type="button" key={item.dateStr} disabled={disabled} aria-pressed={selectedDate === item.dateStr} onClick={() => setSelectedDate(item.dateStr)}><span>{item.dayName}</span><strong>{item.dayNumber}.{String(item.monthNumber).padStart(2, '0')}</strong></button>;
            })}</div>

            {/* Time Slots Area */}
            <div className={styles.times}>
              <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider mb-3">
                Свободни часове за {formatBulgarianDate(selectedDate)}:
              </label>

              {isLoadingSlots ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  <div className="inline-block w-5 h-5 border-2 border-purple-800 border-t-transparent rounded-full animate-spin mb-2" />
                  <p>Проверка на графика...</p>
                </div>
              ) : unavailableReason ? (
                <div className={styles.noSlots}><p>{unavailableReason}</p><span>Изберете друга дата или се свържете с кабинета.</span></div>
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
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Сутрин (09:00 – 13:00)</span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {morningSlots.map((slot) => {
                          const isSlotSelected = selectedSlot === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              aria-pressed={isSlotSelected}
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
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Следобед (14:00 – 18:00)</span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {afternoonSlots.map((slot) => {
                          const isSlotSelected = selectedSlot === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              aria-pressed={isSlotSelected}
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

            <label className="flex items-start gap-3 text-xs text-slate-500 leading-relaxed py-4">
              <input type="checkbox" checked={notificationConsent} onChange={event => setNotificationConsent(event.target.checked)} className="mt-1 accent-purple-700" />
              Желая напомняне за часа по SMS и имейл, ако съм предоставил адрес. Данните се използват само за организацията на посещението.
            </label>

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
                Как да се свържем с Вас?
              </h2>
              <p className="text-xs text-slate-500">
                Данните са необходими за връзка относно Вашето посещение.
              </p>
            </div>

            {/* Recap Box */}
            <div className="bg-white border-y border-purple-100 p-4 mb-5 text-xs sm:text-sm">
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
                  Използваме телефона за връзка относно Вашето посещение.
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
    </div>
  );
}

export default function BookingPage() {
  return (
    <main className={styles.page}>
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
