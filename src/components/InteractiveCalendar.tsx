'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { formatBulgarianDate } from '@/lib/notifications';

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
}: InteractiveCalendarProps) {
  const today = new Date();
  const todayStr = toIsoDate(today.getFullYear(), today.getMonth(), today.getDate());

  // Initial month based on selected date or today
  const initialDate = selectedDate ? new Date(selectedDate) : today;
  const [viewDate, setViewDate] = useState<Date>(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );

  // Sync month view if selected date is changed externally
  useEffect(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [y, m] = selectedDate.split('-').map(Number);
      setViewDate(new Date(y, m - 1, 1));
    }
  }, [selectedDate]);

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

  return (
    <div
      className={`bg-white rounded-3xl border border-purple-100 shadow-lg shadow-purple-900/5 p-4 sm:p-6 transition-all ${className}`}
    >
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-purple-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-slate-900 text-sm sm:text-base">
              {title || (variant === 'admin' ? 'График по календар' : 'Изберете дата')}
            </h3>
            <span className="text-xs text-purple-700 font-semibold">
              {BG_MONTHS[viewMonth]} {viewYear} г.
            </span>
          </div>
        </div>

        {/* Action buttons: Today, Prev, Next, All dates */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {variant === 'admin' && onClearFilter && (
            <button
              type="button"
              onClick={onClearFilter}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                !selectedDate
                  ? 'bg-purple-800 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
              }`}
            >
              Всички дати
            </button>
          )}

          <button
            type="button"
            onClick={handleJumpToToday}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-800 transition-colors"
          >
            Днес
          </button>

          <div className="flex items-center gap-0.5 ml-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Предишен месец"
              className="p-1 rounded-lg text-slate-600 hover:text-purple-800 hover:bg-white transition-all active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Следващ месец"
              className="p-1 rounded-lg text-slate-600 hover:text-purple-800 hover:bg-white transition-all active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
        {BG_DAYS_HEADER.map((day, idx) => (
          <div
            key={day}
            className={`text-[11px] sm:text-xs font-bold py-1 ${
              idx >= 5 ? 'text-purple-400' : 'text-slate-500'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* Previous month padding days */}
        {prevMonthDays.map((item, idx) => {
          const disabled = checkDisabled(item.dateStr, idx);
          return (
            <button
              key={`prev-${item.dateStr}`}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(item.dateStr)}
              className={`h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center text-xs transition-colors text-slate-300 ${
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
          const disabled = checkDisabled(item.dateStr, dayOfWeek);
          const isSelected = selectedDate === item.dateStr;
          const isToday = item.dateStr === todayStr;
          const count = appointmentsByDate[item.dateStr] || 0;

          return (
            <button
              key={item.dateStr}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(item.dateStr)}
              className={`h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center relative transition-all border ${
                disabled
                  ? 'bg-slate-50/50 text-slate-300 border-transparent cursor-not-allowed'
                  : isSelected
                  ? 'bg-purple-800 text-white border-purple-800 shadow-md shadow-purple-900/20 scale-[1.02] z-10'
                  : isToday
                  ? 'bg-purple-50 text-purple-900 font-bold border-purple-200 hover:bg-purple-100'
                  : 'bg-white text-slate-800 border-slate-100 hover:border-purple-200 hover:bg-purple-50/40 active:scale-98'
              }`}
            >
              <span
                className={`text-xs sm:text-sm ${
                  isSelected
                    ? 'font-bold text-white'
                    : isToday
                    ? 'font-bold text-purple-900'
                    : 'font-semibold text-slate-800'
                }`}
              >
                {item.dayNum}
              </span>

              {/* Today label */}
              {isToday && !isSelected && (
                <span className="text-[9px] font-bold text-purple-700 -mt-0.5">
                  днес
                </span>
              )}

              {/* Appointments Badge (Admin Mode) */}
              {variant === 'admin' && count > 0 && (
                <span
                  className={`text-[9px] font-bold px-1.5 rounded-full mt-0.5 ${
                    isSelected
                      ? 'bg-white text-purple-900'
                      : 'bg-purple-100 text-purple-900'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Next month padding days */}
        {nextMonthDays.map((item, idx) => {
          const disabled = checkDisabled(item.dateStr, idx);
          return (
            <button
              key={`next-${item.dateStr}`}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(item.dateStr)}
              className={`h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center text-xs transition-colors text-slate-300 ${
                disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-purple-50/50'
              }`}
            >
              <span className="text-[11px] font-medium">{item.dayNum}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Date Summary bar at the bottom */}
      <div className="mt-4 pt-3 border-t border-purple-50 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600">
          <span className="font-semibold text-slate-500">Избрана дата:</span>
          {selectedDate ? (
            <span className="font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
              {formatBulgarianDate(selectedDate)}
            </span>
          ) : (
            <span className="italic text-slate-400">Всички дати</span>
          )}
        </div>

        {selectedDate && (
          <button
            type="button"
            onClick={() => onSelectDate('')}
            className="text-[11px] text-purple-700 hover:text-purple-900 font-bold underline"
          >
            Изчисти филтъра
          </button>
        )}
      </div>
    </div>
  );
}
