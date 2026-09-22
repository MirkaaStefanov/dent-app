'use client';

import React, { useState } from 'react';
import { Appointment, AppointmentStatus } from '@/types/database';
import { formatBulgarianDate } from '@/lib/notifications';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Phone,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Trash2,
  Calendar as CalendarIcon,
  Sun,
  Sunset,
  Search,
  Check,
} from 'lucide-react';
import InteractiveCalendar from '@/components/InteractiveCalendar';

interface AdminHourlyCalendarProps {
  selectedDate: string; // 'YYYY-MM-DD'
  onSelectDate: (dateStr: string) => void;
  appointments: Appointment[];
  appointmentsByDate: Record<string, number>;
  onStatusChange: (aptId: string, newStatus: AppointmentStatus) => void;
  onSendReminder: (apt: Appointment) => void;
  onDeleteAppointment: (aptId: string, patientName: string) => void;
  onNewAppointmentAt: (dateStr: string, timeStr: string) => void;
}

const BG_WEEKDAYS = [
  'Неделя',
  'Понеделник',
  'Вторник',
  'Сряда',
  'Четвъртък',
  'Петък',
  'Събота',
];

const WORKING_HOURLY_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
];

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function AdminHourlyCalendar({
  selectedDate,
  onSelectDate,
  appointments,
  appointmentsByDate,
  onStatusChange,
  onSendReminder,
  onDeleteAppointment,
  onNewAppointmentAt,
}: AdminHourlyCalendarProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const activeDate = selectedDate || todayStr;

  const [isMonthCalendarOpen, setIsMonthCalendarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Quick 7 days strip for phone swipe
  const quickDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() + idx);
    const dateStr = d.toISOString().split('T')[0];
    const shortDays = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return {
      dateStr,
      dayName: idx === 0 ? 'Днес' : idx === 1 ? 'Утре' : shortDays[d.getDay()],
      dayNum: d.getDate(),
      count: appointmentsByDate[dateStr] || 0,
    };
  });

  const selectedDateObj = new Date(activeDate);
  const weekdayName = BG_WEEKDAYS[selectedDateObj.getDay()];

  // Filter appointments if searching, otherwise show for selected day
  const isSearching = searchTerm.trim().length > 0 || statusFilter !== 'all';

  const displayedAppointments = appointments.filter((apt) => {
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = apt.patient_name.toLowerCase().includes(q);
      const matchPhone = apt.patient_phone.includes(q);
      const matchService = (apt.service_title || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchService;
    }
    return apt.date === activeDate;
  });

  // Group appointments by slot for the day
  const aptsBySlot: Record<string, Appointment[]> = {};
  displayedAppointments.forEach((apt) => {
    const slotKey = apt.start_time;
    if (!aptsBySlot[slotKey]) {
      aptsBySlot[slotKey] = [];
    }
    aptsBySlot[slotKey].push(apt);
  });

  return (
    <div className="space-y-4">

      {/* ───────────────────────────────────────────────────────── */}
      {/* 1. COMPACT TOP CONTROLS FOR MOBILE & DESKTOP */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-purple-100 p-4 sm:p-5 shadow-xs space-y-4">
        
        {/* Row 1: Active Date Title, Stepper & Month Calendar Toggle */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          
          <div className="flex items-center gap-1.5 bg-purple-50 p-1 rounded-2xl border border-purple-100">
            <button
              type="button"
              onClick={() => onSelectDate(shiftDate(activeDate, -1))}
              className="p-2 rounded-xl text-purple-900 hover:bg-purple-100 active:bg-purple-200 transition-colors"
              aria-label="Предишен ден"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onSelectDate(todayStr)}
              className="px-3 py-1 rounded-xl text-xs font-bold text-purple-900 hover:bg-purple-100 transition-colors"
            >
              Днес
            </button>
            <button
              type="button"
              onClick={() => onSelectDate(shiftDate(activeDate, 1))}
              className="p-2 rounded-xl text-purple-900 hover:bg-purple-100 active:bg-purple-200 transition-colors"
              aria-label="Следващ ден"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month picker toggle button */}
          <button
            type="button"
            onClick={() => setIsMonthCalendarOpen(!isMonthCalendarOpen)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
              isMonthCalendarOpen
                ? 'bg-purple-800 text-white border-purple-800'
                : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-50'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5 text-purple-700" />
            <span>{isMonthCalendarOpen ? 'Скрий месеца' : 'Месечен календар'}</span>
          </button>

          {/* "+ Запиши час" Button */}
          <button
            type="button"
            onClick={() => onNewAppointmentAt(activeDate, '10:00')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-purple-900/15 transition-all active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>+ Запиши час за пациент</span>
          </button>

        </div>

        {/* Optional Collapsible Month Calendar */}
        {isMonthCalendarOpen && (
          <div className="pt-2 animate-in fade-in duration-150">
            <InteractiveCalendar
              selectedDate={activeDate}
              onSelectDate={(d) => {
                onSelectDate(d);
                setIsMonthCalendarOpen(false); // auto collapse after pick for mobile space
              }}
              appointmentsByDate={appointmentsByDate}
              variant="admin"
              title="Изберете дата от месеца"
            />
          </div>
        )}

        {/* Row 2: Swipeable Horizontal Day Strip (Ultra Fast Mobile Day Picker) */}
        {!isSearching && (
          <div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
              {quickDays.map((item) => {
                const isSelected = activeDate === item.dateStr;
                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => onSelectDate(item.dateStr)}
                    className={`p-2.5 sm:p-3 rounded-2xl flex flex-col items-center justify-center border shrink-0 min-w-16 sm:min-w-20 transition-all ${
                      isSelected
                        ? 'bg-purple-800 text-white border-purple-800 shadow-sm scale-[1.02]'
                        : 'bg-purple-50/50 text-slate-700 border-purple-100 hover:border-purple-300 active:bg-purple-100'
                    }`}
                  >
                    <span className={`text-[11px] font-bold ${isSelected ? 'text-purple-200' : 'text-slate-500'}`}>
                      {item.dayName}
                    </span>
                    <span className="text-base sm:text-lg font-extrabold mt-0.5">
                      {item.dayNum}
                    </span>
                    {item.count > 0 && (
                      <span
                        className={`text-[9px] font-bold px-1.5 rounded-full mt-1 ${
                          isSelected
                            ? 'bg-white text-purple-900'
                            : 'bg-purple-200 text-purple-900'
                        }`}
                      >
                        {item.count} {item.count === 1 ? 'час' : 'часа'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Row 3: Quick Search & Filter Status */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-purple-50">
          <div className="relative w-full sm:flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Търси пациент, телефон или процедура..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-purple-100 text-xs bg-slate-50/70 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl border border-purple-100 text-xs text-slate-700 bg-slate-50/70 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
            >
              <option value="all">Всички статуси</option>
              <option value="confirmed">Само потвърдени</option>
              <option value="completed">Само приключили</option>
              <option value="cancelled">Само отменени</option>
            </select>

            {isSearching && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="text-[11px] text-purple-700 font-bold underline shrink-0 px-2"
              >
                Изчисти
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 2. ACTIVE DAY HEADLINE */}
      {/* ───────────────────────────────────────────────────────── */}
      {!isSearching && (
        <div className="flex items-center justify-between px-2 text-xs">
          <div>
            <span className="font-serif text-base sm:text-lg font-bold text-slate-900">
              {weekdayName}, {formatBulgarianDate(activeDate)}
            </span>
          </div>
          <span className="text-purple-700 font-bold bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-100">
            {displayedAppointments.length} {displayedAppointments.length === 1 ? 'записан час' : 'записани часа'}
          </span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* 3. HOURLY TIMELINE / SEARCH RESULTS (MOBILE OPTIMIZED) */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-purple-100 shadow-xs overflow-hidden">
        
        {isSearching ? (
          /* Search Results List */
          <div className="divide-y divide-purple-50">
            <div className="p-4 bg-purple-50/50 text-xs font-bold text-purple-900 flex justify-between">
              <span>Резултати от търсенето ({displayedAppointments.length})</span>
            </div>
            {displayedAppointments.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Няма намерени часове по тези критерии.
              </div>
            ) : (
              displayedAppointments.map((apt) => renderAppointmentCard(apt))
            )}
          </div>
        ) : (
          /* Hourly Schedule */
          <div className="divide-y divide-purple-100/70">
            {WORKING_HOURLY_SLOTS.map((slot) => {
              const bookedInThisSlot = aptsBySlot[slot] || [];
              const isBooked = bookedInThisSlot.length > 0;
              const hourNumber = parseInt(slot.split(':')[0], 10);
              const isMorning = hourNumber < 13;

              return (
                <div
                  key={slot}
                  className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-start gap-2.5 sm:gap-4 transition-colors ${
                    isBooked
                      ? 'bg-purple-50/30'
                      : 'hover:bg-purple-50/20'
                  }`}
                >
                  {/* Hour badge */}
                  <div className="w-18 shrink-0 flex items-center gap-1.5 pt-1 text-slate-600">
                    {isMorning ? (
                      <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <Sunset className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    )}
                    <span className="font-mono text-sm sm:text-base font-bold text-slate-900">
                      {slot}
                    </span>
                  </div>

                  {/* Slot Content */}
                  <div className="flex-1 min-w-0">
                    {isBooked ? (
                      <div className="space-y-2.5">
                        {bookedInThisSlot.map((apt) => renderAppointmentCard(apt))}
                      </div>
                    ) : (
                      /* Free Slot: Big Easy Tap Target on Mobile */
                      <button
                        type="button"
                        onClick={() => onNewAppointmentAt(activeDate, slot)}
                        className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-purple-200 hover:border-purple-400 bg-white/70 hover:bg-purple-50/60 flex items-center justify-between text-left transition-all active:scale-98"
                      >
                        <span className="text-xs text-slate-400 font-medium">
                          Свободен час
                        </span>
                        <span className="text-xs font-bold text-purple-800 flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Запиши за {slot}</span>
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );

  // Helper renderer for an appointment card with big, touch-friendly buttons
  function renderAppointmentCard(apt: Appointment) {
    const isCompleted = apt.status === 'completed';
    const isCancelled = apt.status === 'cancelled';

    return (
      <div
        key={apt.id}
        className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
          isCancelled
            ? 'bg-slate-50 border-slate-200 opacity-60'
            : isCompleted
            ? 'bg-emerald-50/40 border-emerald-200'
            : 'bg-white border-purple-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col gap-3">
          
          {/* Top Row: Patient Name & Status */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate">
                {apt.patient_name}
              </h4>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5 flex-wrap">
                <span className="text-purple-800 font-bold">
                  {apt.service_title}
                </span>
                {apt.service_price && (
                  <span className="font-extrabold text-slate-900 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                    {apt.service_price} €
                  </span>
                )}
                <span>&bull;</span>
                <span className="text-slate-600 font-mono">
                  {apt.start_time} – {apt.end_time} ч.
                </span>
              </div>
            </div>

            {/* Status Pill */}
            <span
              className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                apt.status === 'confirmed'
                  ? 'bg-purple-800 text-white'
                  : apt.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {apt.status === 'confirmed'
                ? 'Потвърден'
                : apt.status === 'completed'
                ? 'Приключил'
                : 'Отменен'}
            </span>
          </div>

          {apt.notes && (
            <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl italic">
              „{apt.notes}“
            </p>
          )}

          {/* Bottom Action Row: Big 1-Tap Buttons on Mobile */}
          <div className="pt-2 border-t border-purple-50 flex items-center justify-between gap-2 flex-wrap">
            
            {/* Direct Phone Call Button */}
            <a
              href={`tel:${apt.patient_phone}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs transition-colors active:scale-95"
            >
              <Phone className="w-3.5 h-3.5 text-purple-700" />
              <span>{apt.patient_phone}</span>
            </a>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5">
              {apt.status === 'confirmed' && (
                <button
                  type="button"
                  onClick={() => onStatusChange(apt.id, 'completed')}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors active:scale-95"
                  title="Маркирай като приключил"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Приключи</span>
                </button>
              )}

              {apt.status === 'confirmed' && (
                <button
                  type="button"
                  onClick={() => onStatusChange(apt.id, 'cancelled')}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                  title="Отмени час"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}

              {apt.status === 'cancelled' && (
                <button
                  type="button"
                  onClick={() => onStatusChange(apt.id, 'confirmed')}
                  className="px-3 py-1.5 rounded-xl bg-purple-100 text-purple-800 font-bold text-xs"
                >
                  Възстанови
                </button>
              )}

              <button
                type="button"
                onClick={() => onSendReminder(apt)}
                className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  apt.reminder_sent
                    ? 'bg-purple-100 border-purple-300 text-purple-900'
                    : 'bg-white border-purple-200 text-purple-800 hover:bg-purple-50'
                }`}
                title="Копирай Viber/SMS текст за напомняне"
              >
                <MessageSquare className="w-3.5 h-3.5 text-purple-700" />
                <span className="hidden sm:inline">Viber/SMS</span>
              </button>

              <button
                type="button"
                onClick={() => onDeleteAppointment(apt.id, apt.patient_name)}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Изтрий"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </div>
    );
  }
}
