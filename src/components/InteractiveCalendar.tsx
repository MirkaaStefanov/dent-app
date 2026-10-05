'use client';

import React, { useState } from 'react';
import styles from './InteractiveCalendar.module.css';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { formatBulgarianDate } from '@/lib/notifications';
import { DayOff } from '@/types/database';

export interface InteractiveCalendarProps {
  selectedDate: string; // 'YYYY-MM-DD' or ''
  onSelectDate: (dateStr: string) => void;
  appointmentsByDate?: Record<string, number>; // dateStr -> count of appointments
  minDate?: string; // 'YYYY-MM-DD' (e.g. today for booking)
  disabledDates?: string[];
  isDateDisabled?: (dateStr: string, dayOfWeekIndex: number) => boolean;
  variant?: 'admin' | 'booking';
  title?: string;
  onClearFilter?: () => void;
  className?: string;
  daysOff?: DayOff[];
}

const BG_MONTHS = [
  'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
  'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'
];

const BG_DAYS_HEADER = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

function toIsoDate(year: number, month: number, day: number): string {
  const y = String(year);
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDayOffForDate(dateStr: string, list: DayOff[] = []): DayOff | undefined {
  return list.find((d) => dateStr >= d.start_date && dateStr <= d.end_date);
}

export default function InteractiveCalendar({
  selectedDate,
  onSelectDate,
  appointmentsByDate = {},
  minDate,
  disabledDates = [],
  isDateDisabled,
  variant = 'booking',
  title,
  onClearFilter,
  className = '',
  daysOff = [],
}: InteractiveCalendarProps) {
  const today = new Date();
  const todayStr = toIsoDate(today.getFullYear(), today.getMonth(), today.getDate());

  // Initial month based on selected date or today
  const initialDate = selectedDate ? new Date(selectedDate) : today;
  const [viewDate, setViewDate] = useState<Date>(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );

  // Follow external date changes without a second effect-driven render.
  const [lastSelectedDate, setLastSelectedDate] = useState(selectedDate);
  if (selectedDate !== lastSelectedDate) {
    setLastSelectedDate(selectedDate);
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [year, month] = selectedDate.split('-').map(Number);
      setViewDate(new Date(year, month - 1, 1));
    }
  }

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleJumpToToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    onSelectDate(todayStr);
  };

  // Calendar calculations (Monday = 0 ... Sunday = 6)
  const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Previous month trailing days
  const prevMonthDays: { dayNum: number; dateStr: string }[] = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    prevMonthDays.push({
      dayNum: d,
      dateStr: toIsoDate(prevY, prevM, d),
    });
  }

  // Current month days
  const currentMonthDays: { dayNum: number; dateStr: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    currentMonthDays.push({
      dayNum: d,
      dateStr: toIsoDate(viewYear, viewMonth, d),
    });
  }

  // Next month leading days
  const totalCells = prevMonthDays.length + currentMonthDays.length;
  const remainder = totalCells % 7;
  const nextMonthDaysCount = remainder === 0 ? 0 : 7 - remainder;
  const nextMonthDays: { dayNum: number; dateStr: string }[] = [];
  for (let d = 1; d <= nextMonthDaysCount; d++) {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    nextMonthDays.push({
      dayNum: d,
      dateStr: toIsoDate(nextY, nextM, d),
    });
  }

  const checkDisabled = (dateStr: string, dayOfWeek: number): boolean => {
    if (minDate && dateStr < minDate) return true;
    if (disabledDates.includes(dateStr)) return true;
    if (isDateDisabled && isDateDisabled(dateStr, dayOfWeek)) return true;
    return false;
  };

  if (variant === 'booking') {
    const cells = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
    return <div className={`${styles.calendar} ${className}`}>
      <div className={styles.header}><h3>{BG_MONTHS[viewMonth]} {viewYear}</h3><div><button type="button" onClick={handleJumpToToday}>Днес</button><button type="button" aria-label="Предишен месец" onClick={handlePrevMonth}><ChevronLeft size={17} /></button><button type="button" aria-label="Следващ месец" onClick={handleNextMonth}><ChevronRight size={17} /></button></div></div>
      <div className={styles.weekdays}>{BG_DAYS_HEADER.map(day => <span key={day}>{day}</span>)}</div>
      <div className={styles.days}>{cells.map((item, index) => {
        const inMonth = index >= prevMonthDays.length && index < prevMonthDays.length + currentMonthDays.length;
        const disabled = checkDisabled(item.dateStr, index % 7) || Boolean(getDayOffForDate(item.dateStr, daysOff));
        return <button type="button" key={item.dateStr} disabled={disabled} data-outside={!inMonth || undefined} aria-pressed={selectedDate === item.dateStr} aria-current={item.dateStr === todayStr ? 'date' : undefined} aria-label={formatBulgarianDate(item.dateStr)} onClick={() => onSelectDate(item.dateStr)}>{item.dayNum}</button>;
      })}</div>
      <p className={styles.selection}>Избрана дата: <strong>{formatBulgarianDate(selectedDate)}</strong></p>
    </div>;
  }

  return (
    <div
      className={`bg-white rounded-3xl border-2 border-purple-200 shadow-xl shadow-purple-950/5 p-3.5 sm:p-6 transition-all ${className}`}
    >
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-purple-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-linear-to-br from-purple-700 to-violet-800 text-white flex items-center justify-center shadow-md shadow-purple-900/20 border border-purple-400/30">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-black text-purple-950 text-sm sm:text-base leading-tight">
              {title || (variant === 'admin' ? 'График по календар' : 'Изберете дата за преглед')}
            </h3>
            <span className="text-xs text-purple-700 font-extrabold flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600 inline-block animate-pulse" />
              <span>{BG_MONTHS[viewMonth]} {viewYear} г.</span>
            </span>
          </div>
        </div>

        {/* Action buttons: Today, Prev, Next, All dates */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {variant === 'admin' && onClearFilter && (
            <button
              type="button"
              onClick={onClearFilter}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                !selectedDate
                  ? 'bg-purple-800 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              Всички дати
            </button>
          )}

          <button
            type="button"
            onClick={handleJumpToToday}
            className="px-3 py-1.5 rounded-xl text-xs font-black bg-purple-100/80 hover:bg-purple-200/80 text-purple-950 border border-purple-200 transition-all cursor-pointer shadow-2xs"
          >
            Днес
          </button>

          <div className="flex items-center gap-0.5 ml-1 bg-purple-50 p-1 rounded-xl border border-purple-200 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Предишен месец"
              className="p-1 rounded-lg text-purple-900 hover:text-purple-950 hover:bg-white transition-all active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Следващ месец"
              className="p-1 rounded-lg text-purple-900 hover:text-purple-950 hover:bg-white transition-all active:scale-95 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Days of Week Header with Weekend Highlight */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2.5 text-center bg-linear-to-r from-purple-100/90 via-violet-100/80 to-purple-100/90 p-1 rounded-2xl border border-purple-200/90">
        {BG_DAYS_HEADER.map((day, idx) => {
          const isWeekendHeader = idx >= 5;
          return (
            <div
              key={day}
              className={`text-[11px] sm:text-xs py-1.5 rounded-xl transition-all ${
                isWeekendHeader
                  ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs font-black'
                  : 'text-purple-950 font-bold'
              }`}
            >
              <span>{day}</span>
              {isWeekendHeader && <span className="hidden sm:inline text-[10px] ml-0.5">☀️</span>}
            </div>
          );
        })}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* Previous month padding days */}
        {prevMonthDays.map((item, idx) => {
          const disabled = checkDisabled(item.dateStr, idx);
          const isWeekend = idx === 5 || idx === 6;
          return (
            <button
              key={`prev-${item.dateStr}`}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(item.dateStr)}
              className={`h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center text-xs transition-colors ${
                isWeekend ? 'bg-amber-50/20 text-slate-300' : 'bg-purple-50/15 text-slate-300'
              } ${
                disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-purple-50/50'
              }`}
            >
              <span className="text-[11px] font-medium">{item.dayNum}</span>
            </button>
          );
        })}

        {/* Current month days */}
        {currentMonthDays.map((item, idx) => {
          const dayOfWeek = (firstDayIndex + idx) % 7;
          const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
          const disabled = checkDisabled(item.dateStr, dayOfWeek);
          const isSelected = selectedDate === item.dateStr;
          const isToday = item.dateStr === todayStr;
          const isPast = minDate ? item.dateStr < minDate : item.dateStr < todayStr;
          const count = appointmentsByDate[item.dateStr] || 0;
          const dayOff = getDayOffForDate(item.dateStr, daysOff);

          return (
            <button
              key={item.dateStr}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(item.dateStr)}
              title={
                dayOff
                  ? `Почивен ден / Отпуск: ${dayOff.reason}`
                  : isWeekend
                  ? 'Уикенд (събота/неделя)'
                  : undefined
              }
              className={`h-12 sm:h-14 rounded-2xl flex flex-col items-center justify-between p-1 sm:p-1.5 relative transition-all border-2 cursor-pointer overflow-hidden ${
                disabled
                  ? 'bg-slate-100/50 text-slate-300 border-slate-200/50 opacity-40 cursor-not-allowed'
                  : isSelected
                  ? 'bg-linear-to-r from-purple-700 to-violet-800 text-white border-purple-800 shadow-md shadow-purple-950/20 scale-[1.02] z-10'
                  : dayOff
                  ? 'bg-rose-50/90 text-rose-950 border-rose-300 hover:border-rose-400 hover:bg-rose-100/80 shadow-2xs'
                  : isToday
                  ? 'bg-linear-to-b from-purple-100 to-violet-100 text-purple-950 font-black border-purple-600 ring-2 ring-purple-400/50 hover:bg-purple-200/70 shadow-xs'
                  : isPast
                  ? 'bg-slate-100/50 text-slate-400 border-slate-200/60 opacity-50'
                  : isWeekend
                  ? 'bg-amber-50/80 text-amber-950 font-bold border-amber-200 hover:border-amber-300 hover:bg-amber-100/80 shadow-2xs'
                  : 'bg-white text-purple-950 font-bold border-purple-100 hover:border-purple-300 hover:bg-purple-50/50 active:scale-98 shadow-2xs'
              }`}
            >
              {/* SVG Cross-Hatch / Strikethrough for Days Off */}
              {dayOff && !disabled && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none stroke-rose-400/60"
                  preserveAspectRatio="none"
                >
                  <line x1="0" y1="0" x2="100%" y2="100%" strokeWidth="1.5" strokeDasharray="3 2" />
                  <line x1="100%" y1="0" x2="0" y2="100%" strokeWidth="1.5" strokeDasharray="3 2" />
                </svg>
              )}

              {/* Day Number and Top Badges */}
              <div className="w-full flex items-center justify-between z-10 relative leading-none">
                <span
                  className={`text-xs sm:text-sm ${
                    isSelected
                      ? 'font-black text-white'
                      : dayOff
                      ? 'font-black text-rose-950'
                      : isToday
                      ? 'font-black text-purple-950'
                      : isWeekend
                      ? 'font-black text-amber-950'
                      : 'font-extrabold text-purple-950'
                  }`}
                >
                  {item.dayNum}
                </span>

                {/* Weekend Badge Icon */}
                {isWeekend && !dayOff && !isSelected && !isPast && (
                  <span className="text-[9px] text-amber-700 font-extrabold">☀️</span>
                )}

                {/* Day Off Palm Icon */}
                {dayOff && !isSelected && (
                  <span className="text-[10px] leading-none" title={dayOff.reason}>
                    🏖️
                  </span>
                )}
              </div>

              {/* Bottom Label: "днес" or Day Off reason / Weekend text */}
              <div className="w-full text-center z-10 relative">
                {isToday && !isSelected && (
                  <span className="inline-block text-[9px] font-black text-purple-900 bg-purple-200/90 px-1 py-0.2 rounded-full uppercase tracking-wider">
                    днес
                  </span>
                )}

                {dayOff && (
                  <span
                    className={`block text-[8px] sm:text-[9px] font-black truncate max-w-full leading-tight ${
                      isSelected ? 'text-white' : 'text-rose-800'
                    }`}
                  >
                    Отпуск
                  </span>
                )}

                {!dayOff && isWeekend && !isToday && (
                  <span
                    className={`block text-[8px] sm:text-[9px] font-extrabold truncate max-w-full leading-tight ${
                      isSelected ? 'text-purple-100' : 'text-amber-800'
                    }`}
                  >
                    Уикенд
                  </span>
                )}

                {/* Appointments Badge (Admin Mode) */}
                {variant === 'admin' && count > 0 && (
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded-full mt-0.5 inline-block ${
                      isSelected
                        ? 'bg-white text-purple-900 shadow-2xs'
                        : 'bg-purple-100 text-purple-950 border border-purple-200'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {/* Next month padding days */}
        {nextMonthDays.map((item, idx) => {
          const disabled = checkDisabled(item.dateStr, idx);
          const isWeekend = idx === 5 || idx === 6;
          return (
            <button
              key={`next-${item.dateStr}`}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(item.dateStr)}
              className={`h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center text-xs transition-colors ${
                isWeekend ? 'bg-amber-50/20 text-slate-300' : 'bg-purple-50/15 text-slate-300'
              } ${
                disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-purple-50/50'
              }`}
            >
              <span className="text-[11px] font-medium">{item.dayNum}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Date Summary & Explanations */}
      {selectedDate && (
        <div className="mt-3.5 pt-3 border-t border-purple-100 space-y-2">
          {(() => {
            const selectedDayOff = getDayOffForDate(selectedDate, daysOff);
            const selDateObj = new Date(selectedDate);
            const selDayOfWeek = (selDateObj.getDay() + 6) % 7;
            const isSelWeekend = selDayOfWeek === 5 || selDayOfWeek === 6;

            if (selectedDayOff) {
              return (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-2.5 sm:p-3 text-rose-950 flex items-center gap-2.5 shadow-2xs">
                  <span className="text-xl shrink-0">🏖️</span>
                  <div className="text-xs min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-rose-900 uppercase tracking-wide text-[10px] bg-rose-200 px-1.5 py-0.2 rounded-md">
                        Период на отпуск
                      </span>
                      <span className="font-extrabold text-rose-950">
                        {formatBulgarianDate(selectedDate)}
                      </span>
                    </div>
                    <p className="font-bold text-rose-900 mt-0.5 leading-snug">
                      Основание: {selectedDayOff.reason}
                    </p>
                    <p className="text-[11px] text-rose-700/90 mt-0.5">
                      Период: {formatBulgarianDate(selectedDayOff.start_date)} –{' '}
                      {formatBulgarianDate(selectedDayOff.end_date)}. Моля, изберете работен ден извън този интервал.
                    </p>
                  </div>
                </div>
              );
            }

            if (isSelWeekend) {
              return (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-2.5 sm:p-3 text-amber-950 flex items-center gap-2.5 shadow-2xs">
                  <span className="text-xl shrink-0">☀️</span>
                  <div className="text-xs min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-amber-900 uppercase tracking-wide text-[10px] bg-amber-200 px-1.5 py-0.2 rounded-md">
                        Почивен ден
                      </span>
                      <span className="font-extrabold text-amber-950">
                        {formatBulgarianDate(selectedDate)} (уикенд)
                      </span>
                    </div>
                    <p className="text-amber-900 font-semibold mt-0.5">
                      Кабинетът на Д-р Джанел Аяз приема пациенти от понеделник до петък. Моля, изберете делничен ден за преглед.
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500">Избрана дата за преглед:</span>
                  <span className="font-black text-purple-950 bg-purple-100/90 px-2.5 py-1 rounded-xl border border-purple-200 shadow-2xs">
                    {formatBulgarianDate(selectedDate)}
                  </span>
                </div>

                {variant === 'admin' && onClearFilter && (
                  <button
                    type="button"
                    onClick={() => onSelectDate('')}
                    className="text-[11px] text-purple-700 hover:text-purple-950 font-black underline cursor-pointer"
                  >
                    Изчисти филтъра
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Visual Color Legend (Легенда за цветовете) */}
      <div className="mt-3.5 pt-3 border-t border-purple-100 flex items-center gap-2.5 sm:gap-4 flex-wrap text-[10px] sm:text-[11px] font-semibold text-purple-950">
        <span className="text-purple-400 font-black">Легенда:</span>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-white border-2 border-purple-200" />
          <span className="text-purple-950 font-bold">Работен ден</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-amber-100 border border-amber-400" />
          <span className="text-amber-950 font-black">Уикенд (Сб / Нд)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-rose-100 border border-rose-400 relative overflow-hidden flex items-center justify-center text-[8px] font-black text-rose-700">
            ✕
          </span>
          <span className="text-rose-950 font-black">Отпуск / Почивен ден</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-purple-700 ring-2 ring-purple-300" />
          <span className="text-purple-950 font-black">Днес / Избран</span>
        </div>
      </div>
    </div>
  );
}
