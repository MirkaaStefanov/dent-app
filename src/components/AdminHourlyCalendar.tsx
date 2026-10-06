'use client';

import AdminDayNavigator from './AdminDayNavigator';
import PremiumSelect from '@/components/PremiumSelect';

import React, { useEffect, useState } from 'react';
import styles from './AdminHourlyCalendar.module.css';
import { calculateAvailableSlots } from '@/lib/availability';
import { Appointment, AppointmentStatus, DayOff, WorkingHour, Service } from '@/types/database';
import { formatBulgarianDate } from '@/lib/notifications';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Phone,
  MessageSquare,
  Trash2,
  CalendarDays,
  CalendarRange,
  CalendarOff,
  Search,
  Check,
  User,
  RotateCcw,
  X,
} from 'lucide-react';

interface AdminHourlyCalendarProps {
  selectedDate: string; // 'YYYY-MM-DD'
  onSelectDate: (dateStr: string) => void;
  appointments: Appointment[];
  workingHours: WorkingHour[];
  slotInterval?: number;
  bookingDuration?: number;
  services: Service[];
  bookingServiceId: string;
  onBookingServiceChange: (id: string) => void;
  onStatusChange: (aptId: string, newStatus: AppointmentStatus) => void;
  onSendReminder: (apt: Appointment) => void;
  onDeleteAppointment: (aptId: string, patientName: string) => void;
  onNewAppointmentAt: (dateStr: string, timeStr: string) => void;
  daysOff?: DayOff[];
}

const BG_MONTHS = [
  'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
  'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'
];

const BG_WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const BG_WEEKDAYS_FULL = [
  'Неделя',
  'Понеделник',
  'Вторник',
  'Сряда',
  'Четвъртък',
  'Петък',
  'Събота',
];

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTimeHHmm(t?: string | null): string {
  if (!t) return '00:00';
  const str = String(t).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return str.slice(0, 5);
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function timeStrToMinutes(t?: string | null): number {
  if (!t) return 0;
  const [h, m] = formatTimeHHmm(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function shiftDate(dateStr: string, days: number): string {
  const dt = parseLocalDate(dateStr);
  dt.setDate(dt.getDate() + days);
  return toIsoDate(dt);
}

function getPatientInitials(name?: string): string {
  if (!name) return 'П';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_GRADIENTS = [
  'from-purple-600 to-purple-700',
  'from-purple-700 to-indigo-800',
  'from-fuchsia-600 to-purple-700',
  'from-purple-500 to-pink-600',
  'from-indigo-600 to-purple-600',
  'from-teal-600 to-emerald-700',
];

function getAvatarGradient(name?: string): string {
  if (!name) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getDayOffForDate(dateStr: string, list: DayOff[] = []): DayOff | undefined {
  return list.find((d) => dateStr >= d.start_date && dateStr <= d.end_date);
}

export default function AdminHourlyCalendar({
  selectedDate,
  onSelectDate,
  appointments,
  workingHours,
  slotInterval = 15,
  bookingDuration = 30,
  services, bookingServiceId, onBookingServiceChange,
  onStatusChange,
  onSendReminder,
  onDeleteAppointment,
  onNewAppointmentAt,
  daysOff = [],
}: AdminHourlyCalendarProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const today = now;
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sofia', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const currentTime = new Intl.DateTimeFormat('bg-BG', { timeZone: 'Europe/Sofia', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  const activeDate = selectedDate || todayStr;

  // View modes: 'month' | 'week' | 'day'
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('day');

  // Month navigation state
  const initialDateObj = parseLocalDate(activeDate);
  const [viewMonthDate, setViewMonthDate] = useState<Date>(
    new Date(initialDateObj.getFullYear(), initialDateObj.getMonth(), 1)
  );

  // Search and status filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Selected appointment for detail drawer / modal
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);

  // Toggle for full hourly timeline in day view
  const [showFullTimeline, setShowFullTimeline] = useState(false);

  const availability = calculateAvailableSlots({ date: activeDate, duration: bookingDuration,
    workingHours, daysOff, appointments, interval: slotInterval });

  const activeSchedule = workingHours.find(hour => hour.day_of_week === parseLocalDate(activeDate).getDay());
  const timelineStart = timeStrToMinutes(activeSchedule?.start_time);
  const timelineEnd = timeStrToMinutes(activeSchedule?.end_time);
  const timelineSlots = activeSchedule?.is_working ? Array.from({ length: Math.max(0, Math.ceil((timelineEnd - timelineStart) / 30)) }, (_, index) => {
    const minutes = timelineStart + index * 30;
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }) : [];

  const viewYear = viewMonthDate.getFullYear();
  const viewMonth = viewMonthDate.getMonth();

  const selectDay = (date: string) => {
    onSelectDate(date);
    const next = parseLocalDate(date);
    setViewMonthDate(new Date(next.getFullYear(), next.getMonth(), 1));
  };

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setViewMonthDate(new Date(viewYear, viewMonth - 1, 1));
    } else if (viewMode === 'week') {
      const prevWeekDate = shiftDate(activeDate, -7);
      onSelectDate(prevWeekDate);
      const dt = parseLocalDate(prevWeekDate);
      setViewMonthDate(new Date(dt.getFullYear(), dt.getMonth(), 1));
    } else {
      const prevDay = shiftDate(activeDate, -1);
      onSelectDate(prevDay);
      const dt = parseLocalDate(prevDay);
      setViewMonthDate(new Date(dt.getFullYear(), dt.getMonth(), 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setViewMonthDate(new Date(viewYear, viewMonth + 1, 1));
    } else if (viewMode === 'week') {
      const nextWeekDate = shiftDate(activeDate, 7);
      onSelectDate(nextWeekDate);
      const dt = parseLocalDate(nextWeekDate);
      setViewMonthDate(new Date(dt.getFullYear(), dt.getMonth(), 1));
    } else {
      const nextDay = shiftDate(activeDate, 1);
      onSelectDate(nextDay);
      const dt = parseLocalDate(nextDay);
      setViewMonthDate(new Date(dt.getFullYear(), dt.getMonth(), 1));
    }
  };

  const handleJumpToToday = () => {
    onSelectDate(todayStr);
    setViewMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // Filter appointments
  const isFiltering = searchTerm.trim().length > 0 || statusFilter !== 'all';

  const filterAppointment = (apt: Appointment): boolean => {
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = apt.patient_name.toLowerCase().includes(q);
      const matchPhone = apt.patient_phone.includes(q);
      const matchService = (apt.service_title || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchService;
    }
    return true;
  };

  const filteredAppointments = appointments.filter(filterAppointment);

  // Group appointments by date
  const appointmentsMapByDate: Record<string, Appointment[]> = {};
  filteredAppointments.forEach((apt) => {
    if (!appointmentsMapByDate[apt.date]) {
      appointmentsMapByDate[apt.date] = [];
    }
    appointmentsMapByDate[apt.date].push(apt);
  });

  // Sort day appointments chronologically
  Object.keys(appointmentsMapByDate).forEach((dateKey) => {
    appointmentsMapByDate[dateKey].sort(
      (a, b) => timeStrToMinutes(a.start_time) - timeStrToMinutes(b.start_time)
    );
  });

  // Active day appointments
  const activeDayAppointments = appointmentsMapByDate[activeDate] || [];
  const nextPatient = appointments.filter(apt => apt.date === todayStr && apt.status === 'confirmed' && timeStrToMinutes(apt.start_time) >= timeStrToMinutes(currentTime)).sort((a, b) => a.start_time.localeCompare(b.start_time))[0];
  const currentPatient = appointments.find(apt => apt.date === todayStr && apt.status === 'confirmed' && timeStrToMinutes(apt.start_time) <= timeStrToMinutes(currentTime) && timeStrToMinutes(apt.end_time) > timeStrToMinutes(currentTime));

  // Month grid calculation (Monday = 0 ... Sunday = 6)
  const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const monthGridDays: { dayNum: number; dateStr: string; isCurrentMonth: boolean }[] = [];

  // Trailing days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    monthGridDays.push({
      dayNum: d,
      dateStr: `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isCurrentMonth: false,
    });
  }

  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    monthGridDays.push({
      dayNum: d,
      dateStr: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isCurrentMonth: true,
    });
  }

  // Leading days of next month to complete rows of 7
  const remainder = monthGridDays.length % 7;
  const nextMonthCount = remainder === 0 ? 0 : 7 - remainder;
  for (let d = 1; d <= nextMonthCount; d++) {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    monthGridDays.push({
      dayNum: d,
      dateStr: `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isCurrentMonth: false,
    });
  }

  // Week days calculation
  const weekDays = (() => {
    const target = parseLocalDate(activeDate);
    const dayOfWeek = target.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(target);
    monday.setDate(target.getDate() + mondayOffset);

    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const iso = toIsoDate(d);
      return {
        dateStr: iso,
        dayNameShort: BG_WEEKDAYS_SHORT[idx],
        dayNameFull: BG_WEEKDAYS_FULL[(idx + 1) % 7],
        dayNum: d.getDate(),
        monthNum: d.getMonth() + 1,
        isToday: iso === todayStr,
      };
    });
  })();

  // Title calculation based on viewMode
  const getHeaderTitle = () => {
    if (viewMode === 'month') {
      return `${BG_MONTHS[viewMonth]} ${viewYear} г.`;
    }
    if (viewMode === 'week') {
      const first = weekDays[0];
      const last = weekDays[6];
      return `${first.dayNum} – ${last.dayNum} ${formatBulgarianDate(last.dateStr).split(' ')[1]} ${last.dateStr.split('-')[0]} г.`;
    }
    const selObj = parseLocalDate(activeDate);
    const weekday = BG_WEEKDAYS_FULL[selObj.getDay()];
    return `${weekday}, ${formatBulgarianDate(activeDate)}`;
  };

  return (
    <div className={styles.calendar}>
      {/* ───────────────────────────────────────────────────────── */}
      {/* 1. TOP TOOLBAR: VIEW TOGGLE, NAVIGATION & SEARCH */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="bg-linear-to-r from-purple-50/80 via-white to-purple-50/70 rounded-3xl border border-purple-100 p-3.5 sm:p-5 shadow-sm space-y-3.5">

        {/* Row 1: Active Title & Stepper + View Switcher */}
        <div className={styles.toolbarRow}>

          {/* Stepper & Date Title */}
          <div className={`${styles.periodControls} ${viewMode === 'day' ? styles.hiddenPeriod : ''} flex items-center gap-2`}>
            <div className="inline-flex items-center gap-0.5 bg-purple-100/90 p-1 rounded-2xl border border-purple-200 shadow-2xs">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 sm:p-2 rounded-xl text-purple-900 hover:bg-white hover:text-purple-700 hover:shadow-xs active:bg-purple-200 transition-all cursor-pointer"
                title="Предишен период"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleJumpToToday}
                className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl text-xs font-bold text-purple-950 hover:bg-white hover:text-purple-700 hover:shadow-xs transition-all cursor-pointer"
              >
                Днес
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 sm:p-2 rounded-xl text-purple-900 hover:bg-white hover:text-purple-700 hover:shadow-xs active:bg-purple-200 transition-all cursor-pointer"
                title="Следващ период"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <h2 className="font-serif text-sm sm:text-lg font-bold text-purple-950 truncate pl-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-600 inline-block animate-pulse" />
              <span>{getHeaderTitle()}</span>
            </h2>
          </div>

          {/* View Mode Switcher + Add Button */}
          <div className={styles.viewControls}>
            {/* View Switcher: Month / Week / Day */}
            <div className="inline-flex items-center bg-purple-100/80 p-1 rounded-2xl border border-purple-200">
              <button
                type="button"
                aria-pressed={viewMode === 'month'}
                onClick={() => setViewMode('month')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-purple-800 text-white shadow-xs'
                    : 'text-purple-900 hover:text-purple-950 hover:bg-white/70'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Месец</span>
              </button>

              <button
                type="button"
                aria-pressed={viewMode === 'week'}
                onClick={() => setViewMode('week')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-purple-800 text-white shadow-xs'
                    : 'text-purple-900 hover:text-purple-950 hover:bg-white/70'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Седмица</span>
              </button>

              <button
                type="button"
                aria-pressed={viewMode === 'day'}
                onClick={() => setViewMode('day')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'day'
                    ? 'bg-purple-800 text-white shadow-xs'
                    : 'text-purple-900 hover:text-purple-950 hover:bg-white/70'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Ден</span>
              </button>
            </div>

            {/* Quick "+ Запиши час" Button */}
            <button
              type="button"
              onClick={() => onNewAppointmentAt(activeDate, '10:00')}
              className="px-3.5 sm:px-4 py-2 rounded-2xl bg-purple-800 hover:from-purple-800 hover:to-purple-950 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-purple-900/20 ring-2 ring-purple-400/30 transition-all cursor-pointer active:scale-98 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Запиши нов час</span>
              <span className="sm:hidden">Нов час</span>
            </button>
          </div>

        </div>

        {viewMode === 'day' && <AdminDayNavigator date={activeDate} onChange={selectDay} />}

        {/* Row 2: Search & Status Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2.5 border-t border-purple-100">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Търсене на пациенти"
              placeholder="Търсене по име, телефон или услуга..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-purple-200 text-xs text-purple-950 placeholder-purple-400 bg-white/90 hover:bg-white hover:border-purple-300 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600 text-xs cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <PremiumSelect
              aria-label="Статус на посещенията"
              value={statusFilter}
              onValueChange={setStatusFilter}

            >
              <option value="all">Всички статуси</option>
              <option value="confirmed">Само потвърдени</option>
              <option value="completed">Само приключили</option>
              <option value="cancelled">Само отменени</option>
            </PremiumSelect>

            {isFiltering && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="text-xs text-purple-700 hover:text-purple-900 font-bold underline shrink-0 px-1 cursor-pointer"
              >
                Изчисти
              </button>
            )}
          </div>
        </div>

        {/* Row 3: Visual Color Legend (Легенда за цветовете) */}
        {viewMode !== 'day' && <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap text-[10px] sm:text-[11px] font-semibold text-purple-900 pt-2 border-t border-purple-100">
          <span className="text-purple-400 font-bold hidden sm:inline">Легенда:</span>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-xs" />
            <span className="text-emerald-950 font-bold">Потвърден / Приключил</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-100 border border-amber-400" />
            <span className="text-amber-900 font-bold">Уикенд (Сб / Нд)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-100 border border-rose-400 relative overflow-hidden flex items-center justify-center text-[8px] font-bold text-rose-700">
              ✕
            </span>
            <span className="text-rose-900 font-bold">Отпуск (с основание)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-white border border-purple-100" />
            <span className="text-purple-900 font-bold">Свободен работен ден</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-purple-600 ring-2 ring-purple-300 animate-pulse" />
            <span className="text-purple-950 font-bold">Днес (активен)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-slate-200 opacity-60" />
            <span className="text-slate-400 font-medium">Отминал ден</span>
          </div>
        </div>}

      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 2. CALENDAR VIEWS (MONTH / WEEK / DAY) */}
      {/* ───────────────────────────────────────────────────────── */}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* VIEW A: FULL MONTH CALENDAR (RESPONSIVE FOR MOBILE & PC) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {viewMode === 'month' && (
        <div className="space-y-4">

          {/* Main Month Box */}
          <div className="bg-white rounded-3xl border border-purple-100 shadow-md shadow-purple-950/5 overflow-hidden p-2.5 sm:p-5">

            {/* Weekdays Header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2.5 text-center bg-linear-to-r from-purple-100/90 via-purple-100/80 to-purple-100/90 p-1.5 rounded-2xl border border-purple-200/90">
              {BG_WEEKDAYS_SHORT.map((day, idx) => {
                const isWknd = idx >= 5;
                return (
                  <div
                    key={day}
                    className={`text-[11px] sm:text-xs font-bold py-1.5 uppercase tracking-wider rounded-xl transition-all ${
                      isWknd
                        ? 'bg-amber-100/90 text-amber-900 border border-amber-300/80 shadow-2xs font-bold'
                        : 'text-purple-950'
                    }`}
                  >
                    <span className="sm:hidden">{day}</span>
                    <span className="hidden sm:inline">
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* ── MOBILE CALENDAR GRID (< sm) ── */}
            <div className="grid grid-cols-7 gap-1 sm:hidden">
              {monthGridDays.map((cell, cellIdx) => {
                const colIndex = cellIdx % 7;
                const isWeekend = colIndex === 5 || colIndex === 6;
                const isSelected = activeDate === cell.dateStr;
                const isToday = cell.dateStr === todayStr;
                const isPast = cell.dateStr < todayStr;
                const dayApts = appointmentsMapByDate[cell.dateStr] || [];
                const hasApts = dayApts.length > 0;
                const hasCompleted = dayApts.some((a) => a.status === 'completed');
                const dayOff = getDayOffForDate(cell.dateStr, daysOff);

                return (
                  <button
                    key={`mob-${cell.dateStr}`}
                    aria-label={`Отвори графика за ${formatBulgarianDate(cell.dateStr)}`}
                    type="button"
                    onClick={() => selectDay(cell.dateStr)}
                    className={`aspect-square p-1 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer relative overflow-hidden ${
                      !cell.isCurrentMonth
                        ? 'bg-purple-50/15 text-slate-300 border-transparent opacity-20 pointer-events-none'
                        : dayOff
                        ? 'bg-rose-50 border-2 border-rose-300 text-rose-950 font-bold shadow-2xs'
                        : isToday
                        ? 'bg-linear-to-b from-purple-100 to-purple-100 border-2 border-purple-600 ring-2 ring-purple-400/50 shadow-xs'
                        : isSelected
                        ? 'bg-purple-800 text-white border-2 border-purple-800 shadow-sm'
                        : isPast
                        ? isWeekend
                          ? 'bg-amber-50/20 text-slate-400 border-slate-200 opacity-50'
                          : 'bg-slate-100/60 text-slate-400 border-slate-200/60 opacity-50'
                        : hasApts
                        ? isWeekend
                          ? 'bg-amber-50 border-2 border-purple-400 text-purple-950 font-bold shadow-2xs'
                          : 'bg-purple-50/80 border border-purple-200 text-purple-950 font-bold shadow-2xs'
                        : isWeekend
                        ? 'bg-amber-50/70 border-2 border-amber-200 text-amber-900 font-bold'
                        : 'bg-white border-2 border-purple-100 text-purple-950 font-bold shadow-2xs'
                    }`}
                  >
                    {/* SVG Cross-Hatch / Strikethrough for Days Off on Mobile */}
                    {dayOff && cell.isCurrentMonth && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-rose-400/50" preserveAspectRatio="none">
                        <line x1="0" y1="0" x2="100%" y2="100%" strokeWidth="1.5" strokeDasharray="3 2" />
                        <line x1="100%" y1="0" x2="0" y2="100%" strokeWidth="1.5" strokeDasharray="3 2" />
                      </svg>
                    )}

                    <span
                      className={`text-xs font-bold leading-none mt-0.5 z-10 relative ${
                        dayOff && cell.isCurrentMonth
                          ? 'text-rose-950'
                          : isSelected && cell.isCurrentMonth
                          ? 'text-white'
                          : isToday
                          ? 'text-purple-950 font-bold'
                          : isPast
                          ? 'text-slate-400'
                          : hasApts
                          ? 'text-purple-950 font-bold'
                          : isWeekend
                          ? 'text-amber-900 font-bold'
                          : 'text-purple-950 font-bold'
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {/* Dot or Palm indicator on mobile */}
                    <div className="flex items-center gap-0.5 mb-0.5 z-10 relative">
                      {dayOff && cell.isCurrentMonth ? (
                        <span className="text-[9px] leading-none"><CalendarOff size={14} aria-hidden="true" /></span>
                      ) : hasApts ? (
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isSelected
                              ? 'bg-white'
                              : hasCompleted
                              ? 'bg-teal-500'
                              : 'bg-purple-600'
                          }`}
                        />
                      ) : (
                        cell.isCurrentMonth && !isPast && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isWeekend ? 'bg-amber-300' : 'bg-purple-200'
                            }`}
                          />
                        )
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── DESKTOP & TABLET CALENDAR GRID (sm: and above) ── */}
            <div className="hidden sm:grid grid-cols-7 gap-2">
              {monthGridDays.map((cell, cellIdx) => {
                const colIndex = cellIdx % 7;
                const isWeekend = colIndex === 5 || colIndex === 6;
                const isSelected = activeDate === cell.dateStr;
                const isToday = cell.dateStr === todayStr;
                const isPast = cell.dateStr < todayStr;
                const dayApts = appointmentsMapByDate[cell.dateStr] || [];
                const totalCount = dayApts.length;
                const hasApts = totalCount > 0;
                const dayOff = getDayOffForDate(cell.dateStr, daysOff);

                return (
                  <div
                    key={`desk-${cell.dateStr}`}
                    onClick={() => selectDay(cell.dateStr)}
                    className={`min-h-[118px] p-2.5 rounded-2xl border-2 transition-all flex flex-col justify-between cursor-pointer relative group overflow-hidden ${
                      !cell.isCurrentMonth
                        ? 'bg-purple-50/15 text-slate-300 border-purple-100/40 opacity-25 pointer-events-none'
                        : dayOff
                        ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-200/60 shadow-2xs hover:border-rose-400'
                        : isToday
                        ? 'bg-linear-to-b from-purple-100/95 via-purple-50/80 to-purple-50/70 border-purple-600 ring-4 ring-purple-400/30 shadow-md'
                        : isSelected
                        ? 'bg-purple-50 border-purple-600 ring-2 ring-purple-400/40 shadow-sm'
                        : isPast
                        ? isWeekend
                          ? 'bg-amber-50/20 text-slate-400 border-slate-200 opacity-55 hover:opacity-85'
                          : 'bg-slate-100/50 text-slate-400 border-slate-200/70 opacity-55 hover:opacity-85'
                        : hasApts
                        ? isWeekend
                          ? 'bg-amber-50/60 border-purple-300 shadow-sm hover:border-purple-500'
                          : 'bg-linear-to-b from-white to-purple-50/30 border-purple-300 shadow-sm hover:border-purple-500'
                        : isWeekend
                        ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300 hover:bg-amber-50/75 shadow-2xs'
                        : 'bg-white border-purple-100 hover:border-purple-300 hover:bg-purple-50/30 shadow-2xs'
                    }`}
                  >
                    {/* SVG Cross-Hatch / Strikethrough for Days Off on Desktop */}
                    {dayOff && cell.isCurrentMonth && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-rose-400/35" preserveAspectRatio="none">
                        <line x1="0" y1="0" x2="100%" y2="100%" strokeWidth="2" strokeDasharray="6 4" />
                        <line x1="100%" y1="0" x2="0" y2="100%" strokeWidth="2" strokeDasharray="6 4" />
                      </svg>
                    )}

                    {/* Cell Top Header: Date number & Today / Weekend / DayOff badge */}
                    <div className="flex items-center justify-between z-10 relative">
                      <div className="flex items-center gap-1.5">
                        <button type="button" aria-label={`Избери ${formatBulgarianDate(cell.dateStr)}`} onClick={event => { event.stopPropagation(); selectDay(cell.dateStr); }}
                          className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg ${
                            dayOff
                              ? 'bg-rose-200 text-rose-950 border border-rose-300 font-bold'
                              : isToday
                              ? 'bg-purple-800 text-white shadow-xs font-bold'
                              : isSelected
                              ? 'bg-purple-600 text-white font-bold'
                              : isPast
                              ? 'text-slate-400 font-semibold bg-slate-100/80'
                              : hasApts
                              ? 'bg-purple-100 text-purple-950 border border-purple-200 font-bold'
                              : isWeekend
                              ? 'bg-amber-200/80 text-amber-950 font-bold'
                              : 'bg-purple-50 text-purple-950 font-bold'
                          }`}
                        >
                          {cell.dayNum}
                        </button>

                        {isToday && (
                          <span className="text-[9px] font-bold text-purple-900 bg-purple-200/90 px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                            Днес
                          </span>
                        )}
                        {dayOff && cell.isCurrentMonth && (
                          <span className="text-[9px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded-md border border-rose-300 flex items-center gap-1 shadow-2xs">
                            <span><CalendarOff size={14} aria-hidden="true" /></span>
                            <span>Отпуск</span>
                          </span>
                        )}
                        {!isToday && !dayOff && isWeekend && cell.isCurrentMonth && !hasApts && (
                          <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md border border-amber-200">
                            Уикенд
                          </span>
                        )}
                      </div>

                      {/* Total appointment count badge if > 0 */}
                      {hasApts && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-linear-to-r from-purple-700 to-purple-700 text-white shadow-xs flex items-center gap-1">
                          <span>{totalCount}</span>
                          <span className="text-[8px] font-semibold">{totalCount === 1 ? 'час' : 'часа'}</span>
                        </span>
                      )}
                    </div>

                    {/* Center Reason Badge if Day Off */}
                    {dayOff && cell.isCurrentMonth ? (
                      <div className="z-10 relative my-auto py-1 px-2 rounded-xl bg-white/95 border-2 border-rose-300 text-rose-950 shadow-xs">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-rose-600 block leading-tight">
                          Основание:
                        </span>
                        <p className="text-[11px] font-bold text-rose-950 line-clamp-2 leading-tight mt-0.5">
                          {dayOff.reason}
                        </p>
                      </div>
                    ) : (
                      /* Cell Appointments List (Chips directly on the calendar) */
                      <div className="my-1.5 space-y-1 flex-1 overflow-hidden z-10 relative">
                        {dayApts.slice(0, 3).map((apt) => {
                          const isCompleted = apt.status === 'completed';
                          const isCancelled = apt.status === 'cancelled';

                          return (
                            <button
                              key={apt.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailAppointment(apt);
                              }}
                              className={`w-full text-left px-1.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold truncate flex items-center gap-1 border transition-all cursor-pointer hover:scale-[1.02] ${
                                isCancelled
                                  ? 'bg-rose-50/80 text-rose-700 border-rose-200 line-through opacity-65'
                                  : isCompleted
                                  ? 'bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100'
                                  : isPast
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-purple-50/90 text-purple-950 border-purple-200 hover:bg-purple-100/90 hover:border-purple-300 shadow-2xs'
                              }`}
                              title={`${formatTimeHHmm(apt.start_time)} - ${apt.patient_name} (${apt.service_title || 'Преглед'})`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCompleted ? 'bg-teal-500' : 'bg-purple-600'}`} />
                              <span className="font-mono text-purple-800 shrink-0 font-bold">
                                {formatTimeHHmm(apt.start_time)}
                              </span>
                              <span className="truncate">{apt.patient_name}</span>
                            </button>
                          );
                        })}

                        {totalCount > 3 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectDay(cell.dateStr);
                            }}
                            className="w-full text-left px-1 text-[10px] font-bold text-purple-700 hover:text-purple-900 hover:underline"
                          >
                            +{totalCount - 3} още
                          </button>
                        )}
                      </div>
                    )}

                    {/* Quick Add on hover for empty or future days (only if not a day off) */}
                    {cell.isCurrentMonth && !isPast && !dayOff && (
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 flex justify-end z-10 relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNewAppointmentAt(cell.dateStr, '10:00');
                          }}
                          className="text-[10px] text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 py-0.5 px-1.5 rounded-md hover:bg-purple-100/80 border border-purple-200/80 cursor-pointer"
                          title="Кликни за да добавиш час"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ час</span>
                        </button>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>

          {/* Quick Agenda Card for Selected Day (Both on Mobile and PC) */}
          {(() => {
            const activeDayOff = getDayOffForDate(activeDate, daysOff);

            return (
              <div className="bg-linear-to-br from-white via-purple-50/20 to-purple-50/30 rounded-3xl border border-purple-100 p-4 sm:p-5 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-purple-100 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-600 ring-2 ring-purple-300" />
                    <h3 className="font-serif text-sm sm:text-base font-bold text-slate-900">
                      {formatBulgarianDate(activeDate)}: <strong className="text-purple-900 font-bold">{activeDayAppointments.length} {activeDayAppointments.length === 1 ? 'пациент' : 'пациенти'}</strong>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode('day')}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                    >
                      Дневен изглед &rarr;
                    </button>
                    {!activeDayOff && (
                      <button
                        type="button"
                        onClick={() => onNewAppointmentAt(activeDate, '10:00')}
                        className="px-3 py-1.5 rounded-xl bg-purple-100 text-purple-950 hover:bg-purple-200 border border-purple-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Запиши час</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Day Off Banner if active day is declared off */}
                {activeDayOff && (
                  <div className="p-3.5 bg-rose-50/90 rounded-2xl border-2 border-rose-300 flex items-center gap-3 text-rose-950 shadow-2xs">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0 text-xl">
                      <CalendarOff size={14} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase text-rose-700 tracking-wider bg-rose-100 px-1.5 py-0.5 rounded-md border border-rose-200">
                          Обявен неработен период / Отпуск
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-rose-950 mt-0.5">
                        Основание: <span className="underline decoration-rose-400">{activeDayOff.reason}</span>
                      </h4>
                      <p className="text-[11px] text-rose-700 font-medium">
                        Период: {formatBulgarianDate(activeDayOff.start_date)} — {formatBulgarianDate(activeDayOff.end_date)}
                      </p>
                    </div>
                  </div>
                )}

                {activeDayAppointments.length === 0 ? (
                  <div className="py-7 text-center text-xs text-slate-500 space-y-2.5 bg-white/70 rounded-2xl border border-dashed border-purple-200">
                    <div className="text-2xl"><CalendarOff size={24} className="mx-auto text-purple-400" /></div>
                    <p className="font-bold text-purple-950 text-sm">
                      {activeDayOff ? `Неработен ден: ${activeDayOff.reason}` : 'Свободен ден — няма записани часове'}
                    </p>
                    <p className="text-slate-500 text-xs max-w-sm mx-auto">
                      {activeDayOff
                        ? `За тази дата е обявен отпуск или почивка. Онлайн записването от пациенти е блокирано.`
                        : `Графикът за ${formatBulgarianDate(activeDate)} е напълно свободен и готов за нови пациенти.`}
                    </p>
                    {!activeDayOff && (
                      <button
                        type="button"
                        onClick={() => onNewAppointmentAt(activeDate, '10:00')}
                        className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-linear-to-r from-purple-700 to-purple-800 hover:from-purple-800 hover:to-purple-900 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Запиши пациент</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {renderDayAgenda()}
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* VIEW B: 7-DAY WEEK VIEW (MOBILE-ADAPTIVE & COLOR CODED) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {viewMode === 'week' && (
        <div className="space-y-3">

          {/* Mobile Week Strip (Horizontal swiper for phones) */}
          <div className="flex gap-2 overflow-x-auto pb-1 sm:hidden scrollbar-none">
            {weekDays.map((day, idx) => {
              const isWeekend = idx >= 5;
              const isSelected = activeDate === day.dateStr;
              const isPast = day.dateStr < todayStr;
              const dayApts = appointmentsMapByDate[day.dateStr] || [];
              const count = dayApts.length;
              const dayOff = getDayOffForDate(day.dateStr, daysOff);

              return (
                <button
                  key={`week-mob-${day.dateStr}`}
                  type="button"
                  onClick={() => onSelectDate(day.dateStr)}
                  className={`p-2.5 rounded-2xl flex flex-col items-center justify-center shrink-0 min-w-16 border-2 transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-linear-to-br from-purple-700 to-purple-800 text-white border-purple-700 shadow-sm'
                      : dayOff
                      ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold'
                      : day.isToday
                      ? 'bg-linear-to-b from-purple-100 to-purple-100 text-purple-950 border-purple-600 font-bold ring-2 ring-purple-400/40'
                      : isPast
                      ? isWeekend
                        ? 'bg-amber-50/30 text-slate-400 border-slate-200 opacity-55'
                        : 'bg-slate-100/70 text-slate-400 border-slate-200 opacity-55'
                      : count > 0
                      ? isWeekend
                        ? 'bg-amber-50 text-purple-950 border-purple-400 font-bold'
                        : 'bg-purple-50 text-purple-950 border-purple-300 font-bold'
                      : isWeekend
                      ? 'bg-amber-50/80 text-amber-950 border-amber-300 font-bold'
                      : 'bg-white text-purple-950 border-purple-150 font-bold'
                  }`}
                >
                  <span className={`text-[10px] uppercase font-bold ${
                    dayOff ? 'text-rose-700' : isWeekend && !isSelected ? 'text-amber-800' : ''
                  }`}>
                    {day.dayNameShort}
                  </span>
                  <span className="text-base font-bold my-0.5">{day.dayNum}</span>
                  {dayOff ? (
                    <span className="text-[10px]"><CalendarOff size={14} aria-hidden="true" /></span>
                  ) : count > 0 ? (
                    <span className={`text-[9px] font-bold px-1.5 rounded-full ${isSelected ? 'bg-white text-purple-900' : 'bg-purple-700 text-white'}`}>
                      {count}
                    </span>
                  ) : (
                    <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isWeekend ? 'bg-amber-300' : 'bg-purple-200'}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Desktop/Tablet 7-Column Grid (md: and above) */}
          <div className={styles.weekScroller}><div className={styles.weekGrid}>
            {weekDays.map((day, idx) => {
              const isWeekend = idx >= 5;
              const dayApts = appointmentsMapByDate[day.dateStr] || [];
              const isSelected = activeDate === day.dateStr;
              const isPast = day.dateStr < todayStr;
              const count = dayApts.length;
              const dayOff = getDayOffForDate(day.dateStr, daysOff);

              return (
                <div
                  key={day.dateStr}
                  onClick={() => onSelectDate(day.dateStr)}
                  className={`${styles.weekColumn} group rounded-2xl border transition-all flex flex-col p-3 cursor-pointer relative overflow-hidden ${
                    dayOff
                      ? 'bg-rose-50/60 border-rose-300 ring-2 ring-rose-200/50 shadow-2xs'
                      : day.isToday
                      ? 'bg-linear-to-b from-purple-100/90 to-purple-50/80 border-purple-600 ring-4 ring-purple-500/25 shadow-md'
                      : isSelected
                      ? 'bg-purple-50 border-purple-600 ring-2 ring-purple-400/40 shadow-sm'
                      : isPast
                      ? isWeekend
                        ? 'bg-amber-50/20 border-slate-200 opacity-60'
                        : 'bg-slate-100/50 border-slate-200/70 opacity-60'
                      : count > 0
                      ? isWeekend
                        ? 'bg-amber-50/50 border-purple-300 shadow-2xs hover:border-purple-500'
                        : 'bg-linear-to-b from-white to-purple-50/20 border-purple-300 shadow-2xs hover:border-purple-500'
                      : isWeekend
                      ? 'bg-amber-50/50 border-amber-250 hover:border-amber-300'
                      : 'bg-white border-purple-100 hover:border-purple-300 shadow-2xs'
                  }`}
                >
                  {/* SVG Cross lines for Week DayOff */}
                  {dayOff && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-rose-400/35" preserveAspectRatio="none">
                      <line x1="0" y1="0" x2="100%" y2="100%" strokeWidth="2" strokeDasharray="6 4" />
                      <line x1="100%" y1="0" x2="0" y2="100%" strokeWidth="2" strokeDasharray="6 4" />
                    </svg>
                  )}

                  {/* Column Header */}
                  <div className={`flex items-center justify-between pb-2 border-b mb-2.5 z-10 relative ${
                    dayOff ? 'border-rose-200' : isWeekend ? 'border-amber-200' : 'border-purple-100'
                  }`}>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-bold uppercase block ${
                          dayOff ? 'text-rose-700' : isWeekend ? 'text-amber-800' : 'text-purple-900'
                        }`}>
                          {day.dayNameShort}
                        </span>
                        {dayOff ? (
                          <span className="text-[8px] font-bold text-rose-800 bg-rose-100 px-1 py-0.2 rounded-sm border border-rose-200 flex items-center gap-0.5">
                            <CalendarOff size={14} aria-hidden="true" /> Отпуск
                          </span>
                        ) : isWeekend ? (
                          <span className="text-[8px] font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded-sm border border-amber-200">
                            Уикенд
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`text-base font-bold ${
                          dayOff ? 'text-rose-950' : day.isToday ? 'text-purple-950 font-bold' : isWeekend ? 'text-amber-950 font-bold' : isPast ? 'text-slate-400' : 'text-purple-950'
                        }`}>
                          {day.dayNum}
                        </span>
                        {day.isToday && (
                          <span className="text-[8px] font-extrabold bg-purple-700 text-white px-1.5 py-0.2 rounded-full uppercase">
                            Днес
                          </span>
                        )}
                      </div>
                    </div>

                    {!dayOff && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNewAppointmentAt(day.dateStr, '10:00');
                        }}
                        className="p-1 rounded-lg text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer"
                        title="Добави час"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Appointments or DayOff in this Day Column */}
                  <div className={`${styles.weekAppointments} space-y-2 z-10 relative`}>
                    {dayOff ? (
                      <div className="p-3 rounded-xl bg-white/95 border-2 border-rose-300 shadow-xs space-y-1.5">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                          <CalendarOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Почивен / Отпуск</span>
                        </div>
                        <p className="text-xs font-bold text-rose-950 leading-snug">
                          {dayOff.reason}
                        </p>
                        <p className="text-[10px] text-rose-600 font-bold">
                          {formatBulgarianDate(dayOff.start_date).split(' ')[0]} - {formatBulgarianDate(dayOff.end_date).split(' ')[0]} {formatBulgarianDate(dayOff.end_date).split(' ')[1]}
                        </p>
                        {count > 0 && (
                          <div className="pt-2 border-t border-rose-100 space-y-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase block">Пациенти ({count}):</span>
                            {dayApts.map((apt) => renderCompactAppointmentCard(apt))}
                          </div>
                        )}
                      </div>
                    ) : count === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-300 py-6">
                        {isPast ? (
                          <span className="text-xs text-slate-300/80 font-mono">—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNewAppointmentAt(day.dateStr, '10:00');
                            }}
                            className="text-[10px] text-purple-700 hover:text-purple-900 font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-purple-50 px-2 py-1 rounded-lg border border-purple-200 cursor-pointer"
                          >
                            + час
                          </button>
                        )}
                      </div>
                    ) : (
                      dayApts.map((apt) => renderCompactAppointmentCard(apt))
                    )}
                  </div>
                </div>
              );
            })}
          </div></div>

          {/* Active Day Agenda in Week View for Phone */}
          {(() => {
            const activeDayOff = getDayOffForDate(activeDate, daysOff);

            return (
              <div className="bg-white rounded-3xl border border-purple-100 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-purple-100 pb-2.5">
                  <h3 className="font-bold text-purple-950 text-sm">
                    {formatBulgarianDate(activeDate)} ({activeDayAppointments.length} пациента)
                  </h3>
                  {!activeDayOff && (
                    <button
                      type="button"
                      onClick={() => onNewAppointmentAt(activeDate, '10:00')}
                      className="text-xs font-bold text-purple-800 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Запиши</span>
                    </button>
                  )}
                </div>

                {activeDayOff && (
                  <div className="p-3 bg-rose-50 rounded-2xl border-2 border-rose-300 text-rose-950 space-y-1">
                    <div className="text-[10px] font-bold uppercase text-rose-700">Обявен неработен ден / Отпуск</div>
                    <div className="font-bold text-xs text-rose-950">Основание: {activeDayOff.reason}</div>
                    <div className="text-[10px] text-rose-700">
                      Период: {formatBulgarianDate(activeDayOff.start_date)} — {formatBulgarianDate(activeDayOff.end_date)}
                    </div>
                  </div>
                )}

                <div className="space-y-3">{renderDayAgenda()}</div>
              </div>
            );
          })()}

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* VIEW C: FOCUSED DAY VIEW WITH PATIENT CARDS & OPEN SLOTS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {viewMode === 'day' && (
        <div className="space-y-4">

          <div className={styles.daySummary}>
            <div className={styles.daySummaryRow}><span>{activeDayAppointments.length} посещения {isFiltering ? 'по избраните филтри' : 'за деня'}</span><button type="button" onClick={() => setShowFullTimeline(!showFullTimeline)}>{showFullTimeline ? 'Скрий хронологията' : 'Покажи хронологията'}</button></div>
            {/* Day Off Banner in Day View */}
            {(() => {
              const activeDayOff = getDayOffForDate(activeDate, daysOff);
              if (!activeDayOff) return null;
              return (
                <div className="p-3.5 bg-rose-50 rounded-2xl border-2 border-rose-300 flex items-center gap-3 text-rose-950 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0 text-xl">
                    <CalendarOff size={14} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-bold uppercase text-rose-700 tracking-wider bg-rose-100 px-1.5 py-0.5 rounded-md border border-rose-200">
                      Обявен неработен период / Отпуск
                    </span>
                    <h4 className="text-sm font-bold text-rose-950 mt-0.5">
                      Основание: <span className="underline decoration-rose-400">{activeDayOff.reason}</span>
                    </h4>
                    <p className="text-[11px] text-rose-700 font-medium">
                      Период: {formatBulgarianDate(activeDayOff.start_date)} — {formatBulgarianDate(activeDayOff.end_date)}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="space-y-3">
            {renderDayAgenda()}
          </div>

          <section className={styles.availability}>
            <div className={styles.localDayNavigation}><AdminDayNavigator date={activeDate} onChange={selectDay} /></div>
            <div className={styles.slotHeading}><div><span className="eyebrow">НОВО ПОСЕЩЕНИЕ</span><h3>Свободни часове</h3><p>За процедура с продължителност {bookingDuration} мин. · Съобразени с работното време и почивките.</p></div><span className={styles.slotCount}>{availability.slots.length} налични</span></div>
            <label className={styles.serviceSelector}><span>Процедура за новия час</span><PremiumSelect aria-label="Процедура за новия час" value={bookingServiceId} onValueChange={onBookingServiceChange}>{services.filter(service => service.is_active).map(service => <option key={service.id} value={service.id}>{service.title} · {service.duration_minutes} мин.</option>)}</PremiumSelect></label>
            {availability.slots.length === 0 ? <p className={styles.noSlots}>{availability.reason}</p> : <div className={styles.slotGroups}>{['Сутрин', 'Следобед'].map((period, index) => {
              const slots = availability.slots.filter(slot => index === 0 ? slot < '13:00' : slot >= '13:00');
              return slots.length > 0 && <div key={period}><h4>{period}</h4><div className={styles.slotGrid}>{slots.map(slot => <button type="button" key={slot} onClick={() => onNewAppointmentAt(activeDate, slot)} aria-label={`Запиши час в ${slot}`}>{slot}<Plus size={12} /></button>)}</div></div>;
            })}</div>}
          </section>

          {/* Section 3: Optional Full Timeline */}
          {showFullTimeline && (
            <div className="bg-white rounded-3xl border border-purple-200 shadow-xs overflow-hidden p-4 sm:p-5 space-y-3">
              <h4 className="font-serif text-sm font-bold text-purple-950 mb-2">
                Пълна часова хронология
              </h4>
              <div className="divide-y divide-purple-100">
                {timelineSlots.map((slot) => {
                  const slotMins = timeStrToMinutes(slot);
                  const nextSlotMins = slotMins + 30;

                  const startingInSlot = appointments.filter((apt) => {
                    const aptStart = timeStrToMinutes(apt.start_time);
                    return apt.date === activeDate && apt.status !== 'cancelled' && aptStart >= slotMins && aptStart < nextSlotMins;
                  });

                  const ongoingInSlot = appointments.filter((apt) => {
                    if (startingInSlot.some((s) => s.id === apt.id)) return false;
                    const aptStart = timeStrToMinutes(apt.start_time);
                    const aptEnd = timeStrToMinutes(apt.end_time);
                    return apt.date === activeDate && apt.status !== 'cancelled' && aptStart < slotMins && aptEnd > slotMins;
                  });

                  const isBooked = startingInSlot.length > 0;
                  const hasOngoing = ongoingInSlot.length > 0;

                  return (
                    <div key={slot} className="py-2.5 flex items-center gap-4">
                      <span className="font-mono text-xs font-bold text-purple-950 w-16 shrink-0">
                        {slot}
                      </span>
                      <div className="flex-1">
                        {isBooked ? (
                          <div className="space-y-1">
                            {startingInSlot.map((a) => (
                              <div key={a.id} className="text-xs font-bold text-purple-950 bg-purple-50 p-2 rounded-xl border border-purple-200 flex justify-between">
                                <span>{a.patient_name} ({a.service_title})</span>
                                <span className="font-mono font-bold">{formatTimeHHmm(a.start_time)} – {formatTimeHHmm(a.end_time)}</span>
                              </div>
                            ))}
                          </div>
                        ) : hasOngoing ? (
                          <span className="text-xs text-purple-800 bg-purple-50/70 px-2 py-1 rounded-lg border border-purple-100 font-semibold">
                            Продължаваща процедура (до {formatTimeHHmm(ongoingInSlot[0].end_time)} ч.)
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-normal">{availability.slots.includes(slot) ? 'Свободен за избраната процедура' : 'Неналичен за записване'}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* 3. APPOINTMENT DETAILS MODAL (FOR MOBILE & DESKTOP) */}
      {/* ───────────────────────────────────────────────────────── */}
      {detailAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-purple-100 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-7 space-y-4 animate-in zoom-in-95 duration-150">

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-purple-700 via-purple-700 to-indigo-800 text-white flex items-center justify-center shadow-md shadow-purple-950/20 shrink-0">
                  <User className="w-5 h-5 text-purple-100" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-base sm:text-lg font-bold text-purple-950 leading-snug truncate">
                    {detailAppointment.patient_name}
                  </h3>
                  <span className="text-xs text-purple-800 font-medium block">
                    {formatBulgarianDate(detailAppointment.date)} &bull; {formatTimeHHmm(detailAppointment.start_time)} – {formatTimeHHmm(detailAppointment.end_time)} ч.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailAppointment(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Appointment Details Box */}
            <div className="bg-linear-to-br from-purple-50/80 to-purple-50/60 rounded-2xl p-4 border border-purple-200 space-y-2.5 text-xs text-purple-950">
              <div className="flex items-center justify-between pb-2 border-b border-purple-200/70">
                <span className="text-purple-800/80 font-medium">Процедура:</span>
                <span className="font-bold text-purple-950 text-right">{detailAppointment.service_title || 'Преглед'}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-purple-200/70">
                <span className="text-purple-800/80 font-medium">Времетраене:</span>
                <span className="font-bold text-purple-900">{detailAppointment.service_duration || 30} минути</span>
              </div>
              {detailAppointment.service_price !== undefined && (
                <div className="flex items-center justify-between pb-2 border-b border-purple-200/70">
                  <span className="text-purple-800/80 font-medium">Цена:</span>
                  <span className="font-bold text-purple-950 text-sm">{detailAppointment.service_price} €</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-purple-800/80 font-medium">Статус:</span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                  detailAppointment.status === 'confirmed'
                    ? 'bg-purple-700 text-white'
                    : detailAppointment.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {detailAppointment.status === 'confirmed' ? 'Потвърден' : detailAppointment.status === 'completed' ? 'Приключил' : 'Отменен'}
                </span>
              </div>
            </div>

            {/* Clinical Note */}
            {detailAppointment.notes && (
              <div className="bg-purple-50/40 p-3 rounded-2xl border border-purple-100 text-xs">
                <span className="font-bold text-purple-900 block mb-0.5">Оплакване / Бележка:</span>
                <p className="text-purple-950 italic">„{detailAppointment.notes}“</p>
              </div>
            )}

            {/* Communication Action Row */}
            <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
              <a
                href={`tel:${detailAppointment.patient_phone}`}
                className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-purple-50/80 hover:bg-purple-100 text-purple-950 font-bold text-xs border border-purple-200 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-purple-700" />
                <span>Обаждане ({detailAppointment.patient_phone})</span>
              </a>

              <a
                href={`sms:${detailAppointment.patient_phone.replace(/\s+/g, '')}?&body=${encodeURIComponent(
                  `Здравейте ${detailAppointment.patient_name}, напомняме Ви за Вашия час при Д-р Джанел Аяз на ${formatBulgarianDate(detailAppointment.date)} от ${formatTimeHHmm(detailAppointment.start_time)} ч. Кабинет: гр. Търговище, бул. „Васил Левски“ №12, тел. 088 812 3456.`
                )}`}
                onClick={() => onSendReminder(detailAppointment)}
                className="inline-flex items-center gap-1 py-2.5 px-3.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-950 text-xs font-bold border border-purple-300 transition-colors"
                title="Отвори SMS"
              >
                <MessageSquare className="w-3.5 h-3.5 text-purple-700" />
                <span>SMS</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  onSendReminder(detailAppointment);
                  setDetailAppointment((prev) => prev ? { ...prev, reminder_sent: true } : null);
                }}
                className="inline-flex items-center gap-1 py-2.5 px-3.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold border border-purple-200 transition-colors cursor-pointer"
                title="Копирай напомняне за Viber"
              >
                <span>Viber</span>
              </button>
            </div>

            {/* Status Management Actions */}
            <div className="pt-3 border-t border-purple-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {detailAppointment.status === 'confirmed' && (
                  <button
                    type="button"
                    onClick={() => {
                      onStatusChange(detailAppointment.id, 'completed');
                      setDetailAppointment(null);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Приключи</span>
                  </button>
                )}

                {detailAppointment.status === 'confirmed' && (
                  <button
                    type="button"
                    onClick={() => {
                      onStatusChange(detailAppointment.id, 'cancelled');
                      setDetailAppointment(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:bg-purple-50 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Отмени
                  </button>
                )}

                {detailAppointment.status === 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => {
                      onStatusChange(detailAppointment.id, 'confirmed');
                      setDetailAppointment(null);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-100 text-purple-800 hover:bg-purple-200 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Възстанови</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  onDeleteAppointment(detailAppointment.id, detailAppointment.patient_name);
                  setDetailAppointment(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Изтрий часа"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );

  function renderDayAgenda() {
    const isToday = activeDate === todayStr;
    const markerIndex = activeDayAppointments.findIndex(apt => timeStrToMinutes(apt.start_time) >= timeStrToMinutes(currentTime));
    const marker = <div className={styles.nowLine}><span>Сега · {currentTime}</span></div>;
    return <>
      {isToday && <div className={styles.liveSummary}>
        <div><span className={styles.liveDot} /><strong>Сега {currentTime}</strong><small>Часът на кабинета</small></div>
        {currentPatient && <div><span>В момента</span><strong>{currentPatient.patient_name}</strong><small>до {formatTimeHHmm(currentPatient.end_time)}</small></div>}
        <div><span>Следващ пациент</span><strong>{nextPatient?.patient_name || 'Няма оставащи посещения'}</strong>{nextPatient && <small>{formatTimeHHmm(nextPatient.start_time)}</small>}</div>
      </div>}
      {activeDayAppointments.length === 0 && <div className={styles.emptyDay}><Clock size={19} /><div><strong>{isFiltering ? 'Няма посещения по избраните филтри' : 'Няма записани посещения за този ден'}</strong><p>Изберете процедура и свободен час за ново записване.</p></div></div>}
      {activeDayAppointments.map((apt, index) => <React.Fragment key={apt.id}>
        {isToday && index === markerIndex && marker}
        <div className={isToday && (apt.id === currentPatient?.id || apt.id === nextPatient?.id) ? styles.highlightPatient : undefined}>
          {isToday && apt.id === nextPatient?.id && <span className={styles.patientLabel}>Следващ пациент · {formatTimeHHmm(apt.start_time)}</span>}
          {isToday && apt.id === currentPatient?.id && <span className={styles.patientLabel}>В момента · до {formatTimeHHmm(apt.end_time)}</span>}
          {renderDetailedAppointmentCard(apt)}
        </div>
      </React.Fragment>)}
      {isToday && markerIndex === -1 && marker}
    </>;
  }

  // Helper renderer for compact card in Week/Month agenda
  function renderCompactAppointmentCard(apt: Appointment) {
    const isCompleted = apt.status === 'completed';
    const isCancelled = apt.status === 'cancelled';
    const isPast = apt.date < todayStr;

    return (
      <div
        key={apt.id}
        onClick={(e) => {
          e.stopPropagation();
          setDetailAppointment(apt);
        }}
        className={`${styles.appointmentCard} p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-md text-left flex flex-col justify-between gap-2.5 ${
          isCancelled
            ? 'bg-slate-50/70 border-slate-200/80 opacity-60'
            : isCompleted
            ? 'bg-teal-50/30 border-teal-200/80 hover:border-teal-300'
            : isPast
            ? 'bg-slate-50/90 border-slate-200/80 text-slate-700'
            : 'bg-white border-purple-200 hover:border-purple-400 shadow-2xs'
        }`}
      >
        {/* Top Header: Time, Price & Status */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold text-purple-950 bg-purple-100 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Clock className="w-3 h-3 text-purple-600" />
              <span>{formatTimeHHmm(apt.start_time)} – {formatTimeHHmm(apt.end_time)}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {apt.service_price !== undefined && (
              <span className="text-xs font-bold text-purple-950 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                {apt.service_price} €
              </span>
            )}
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                isCancelled
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : isCompleted
                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                  : 'bg-purple-100 text-purple-900 border-purple-200 font-bold'
              }`}
            >
              {isCancelled ? 'Отменен' : isCompleted ? 'Приключил ✓' : 'Потвърден'}
            </span>
          </div>
        </div>

        {/* Patient Info with Avatar Initials */}
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl bg-linear-to-br ${getAvatarGradient(
              apt.patient_name
            )} text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0`}
          >
            {getPatientInitials(apt.patient_name)}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
              {apt.patient_name}
            </h4>
            <p className="text-[11px] text-purple-800/80 font-semibold truncate mt-0.5">
              {apt.service_title || 'Преглед'}
            </p>
          </div>
        </div>

        {/* Direct Quick 1-Tap Action Row */}
        <div className="pt-2 border-t border-purple-100/70 flex items-center justify-between gap-1.5 flex-wrap">
          <a
            href={`tel:${apt.patient_phone}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-950 text-[11px] font-bold transition-colors cursor-pointer border border-purple-200"
            title={`Позвъни на ${apt.patient_phone}`}
          >
            <Phone className="w-3 h-3 text-purple-600" />
            <span className="truncate max-w-[85px]">{apt.patient_phone}</span>
          </a>

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onSendReminder(apt)}
              className={`p-1.5 rounded-lg border text-[11px] transition-colors cursor-pointer ${
                apt.reminder_sent
                  ? 'bg-purple-100 border-purple-300 text-purple-900 font-bold'
                  : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'
              }`}
              title="Копирай напомняне за Viber/SMS"
            >
              <MessageSquare className="w-3 h-3 text-purple-700" />
            </button>

            {apt.status === 'confirmed' && (
              <button
                type="button"
                onClick={() => onStatusChange(apt.id, 'completed')}
                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-2xs cursor-pointer flex items-center gap-0.5"
                title="Маркирай като приключил"
              >
                <Check className="w-3 h-3" />
                <span>Приключи</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Helper renderer for full detailed appointment card in Day view
  function renderDetailedAppointmentCard(apt: Appointment) {
    const isCompleted = apt.status === 'completed';
    const isCancelled = apt.status === 'cancelled';
    const isPast = apt.date < todayStr;

    return (
      <div
        key={apt.id}
        className={`${styles.patientCard} p-3.5 sm:p-4 rounded-3xl border transition-all ${
          isCancelled
            ? 'bg-slate-50/70 border-l-4 border-l-rose-400 border-slate-200 opacity-65'
            : isCompleted
            ? 'bg-teal-50/20 border-l-4 border-l-teal-500 border-teal-100 shadow-xs'
            : isPast
            ? 'bg-slate-50/70 border-l-4 border-l-slate-400 border-slate-200'
            : 'bg-white border-l-4 border-l-purple-600 border-purple-200 shadow-xs hover:shadow-md'
        }`}
      >
        <div className="flex flex-col gap-3">

          {/* Top Row: Patient Avatar, Name & Status & Price */}
          <div className="flex items-start justify-between gap-2.5 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-2xl bg-linear-to-br ${getAvatarGradient(
                  apt.patient_name
                )} text-white font-extrabold text-sm flex items-center justify-center shadow-xs shrink-0`}
              >
                {getPatientInitials(apt.patient_name)}
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-purple-950 text-sm sm:text-base leading-snug truncate">
                  {apt.patient_name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-600 font-medium mt-0.5 flex-wrap">
                  <span className="font-bold text-purple-950 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                    {apt.service_title || 'Преглед'}
                  </span>
                  <span className="text-purple-800 font-mono flex items-center gap-1 font-bold">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    <span>{formatTimeHHmm(apt.start_time)} – {formatTimeHHmm(apt.end_time)} ч.</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {apt.service_price !== undefined && (
                <span className="font-bold text-purple-950 bg-purple-100 px-2.5 py-1 rounded-xl text-sm border border-purple-200 shadow-2xs">
                  {apt.service_price} €
                </span>
              )}

              {/* Status Pill */}
              <span
                className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 border ${
                  apt.status === 'confirmed'
                    ? 'bg-purple-100 text-purple-950 border-purple-300 shadow-2xs'
                    : apt.status === 'completed'
                    ? 'bg-teal-50 text-teal-800 border-teal-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {apt.status === 'confirmed' && <span className="w-1.5 h-1.5 rounded-full bg-purple-600 inline-block" />}
                {apt.status === 'confirmed'
                  ? 'Потвърден'
                  : apt.status === 'completed'
                  ? 'Приключил ✓'
                  : 'Отменен'}
              </span>
            </div>
          </div>

          {/* Clinical note if any */}
          {apt.notes && (
            <p className="text-xs text-purple-950 bg-purple-50/60 border border-purple-100 p-2.5 rounded-xl italic">
              💬 „{apt.notes}“
            </p>
          )}

          {/* Action Row */}
          <div className="pt-2 border-t border-purple-100 flex items-center justify-between gap-2 flex-wrap">
            <a
              href={`tel:${apt.patient_phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-950 font-bold text-xs transition-colors active:scale-95 border border-purple-200"
            >
              <Phone className="w-3.5 h-3.5 text-purple-700" />
              <span>{apt.patient_phone}</span>
            </a>

            <div className="flex items-center gap-1.5 flex-wrap">
              {apt.status === 'confirmed' && (
                <button
                  type="button"
                  onClick={() => onStatusChange(apt.id, 'completed')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs active:scale-95 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Приключи ✓</span>
                </button>
              )}

              {apt.status === 'confirmed' && (
                <button
                  type="button"
                  onClick={() => onStatusChange(apt.id, 'cancelled')}
                  className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:bg-purple-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Отмени
                </button>
              )}

              {apt.status === 'cancelled' && (
                <button
                  type="button"
                  onClick={() => onStatusChange(apt.id, 'confirmed')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-100 text-purple-900 hover:bg-purple-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Възстанови</span>
                </button>
              )}

              <a
                href={`sms:${apt.patient_phone.replace(/\s+/g, '')}?&body=${encodeURIComponent(
                  `Здравейте ${apt.patient_name}, напомняме Ви за Вашия час при Д-р Джанел Аяз на ${formatBulgarianDate(apt.date)} от ${formatTimeHHmm(apt.start_time)} ч. Кабинет: гр. Търговище, бул. „Васил Левски“ №12, тел. 088 812 3456.`
                )}`}
                onClick={() => onSendReminder(apt)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-300 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-purple-700" />
                <span>SMS</span>
              </a>

              <button
                type="button"
                onClick={() => onSendReminder(apt)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  apt.reminder_sent
                    ? 'bg-purple-100 border-purple-300 text-purple-950 font-bold'
                    : 'bg-white border-purple-200 text-purple-900 hover:bg-purple-50 hover:border-purple-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
                <span>{apt.reminder_sent ? 'Viber (напомнен)' : 'Viber'}</span>
              </button>

              <button
                type="button"
                onClick={() => onDeleteAppointment(apt.id, apt.patient_name)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Изтрий часа"
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
