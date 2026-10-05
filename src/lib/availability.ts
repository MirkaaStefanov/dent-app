import type { Appointment, DayOff, DayOfWeek, WorkingHour } from '../types/database';

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function timeToMinutes(timeStr?: string | null): number {
  if (!timeStr) return 0;
  const clean = String(timeStr).trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function calculateAvailableSlots({
  date: dateStr, duration: durationMinutes, workingHours, daysOff, appointments: allAppointments,
  interval = 15, now = new Date(),
}: {
  date: string; duration: number; workingHours: WorkingHour[]; daysOff: DayOff[];
  appointments: Appointment[]; interval?: number; now?: Date;
}): { slots: string[]; reason?: string } {
  const dateObj = parseLocalDate(dateStr);
  const dayOfWeek = dateObj.getDay() as DayOfWeek;

  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (dateStr < today) return { slots: [], reason: 'Датата е отминала' };
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return { slots: [], reason: 'Изберете валидна продължителност' };
  // 1. Почивни дни / отпуски
  const matchingDayOff = daysOff.find((d) => dateStr >= d.start_date && dateStr <= d.end_date);
  if (matchingDayOff) {
    return {
      slots: [],
      reason: `Неработен ден (${matchingDayOff.reason})`,
    };
  }

  // 2. Работно време
  const daySchedule = workingHours.find((wh) => wh.day_of_week === dayOfWeek);

  if (!daySchedule || !daySchedule.is_working) {
    return {
      slots: [],
      reason: 'Почивен ден за кабинета',
    };
  }

  const startMinutes = timeToMinutes(daySchedule.start_time);
  const endMinutes = timeToMinutes(daySchedule.end_time);
  const breakStart = daySchedule.break_start ? timeToMinutes(daySchedule.break_start) : null;
  const breakEnd = daySchedule.break_end ? timeToMinutes(daySchedule.break_end) : null;

  // 3. Заети часове
  const dayAppointments = allAppointments.filter(
    (apt) => apt.date === dateStr && apt.status !== 'cancelled'
  );

  const busyIntervals: { start: number; end: number }[] = [];

  if (breakStart !== null && breakEnd !== null) {
    busyIntervals.push({ start: breakStart, end: breakEnd });
  }

  for (const apt of dayAppointments) {
    busyIntervals.push({
      start: timeToMinutes(apt.start_time),
      end: timeToMinutes(apt.end_time),
    });
  }

  // 4. Генериране на кандидат слотове
  const slotInterval = Number.isFinite(interval) && interval > 0 ? interval : 15;
  const availableSlots: string[] = [];

  const isToday =
    now.getFullYear() === dateObj.getFullYear() &&
    now.getMonth() === dateObj.getMonth() &&
    now.getDate() === dateObj.getDate();
  const currentMinutesNow = now.getHours() * 60 + now.getMinutes() + 15;

  for (let current = startMinutes; current + durationMinutes <= endMinutes; current += slotInterval) {
    const slotStart = current;
    const slotEnd = current + durationMinutes;

    if (isToday && slotStart < currentMinutesNow) {
      continue;
    }

    const overlaps = busyIntervals.some((busy) => {
      return slotStart < busy.end && slotEnd > busy.start;
    });

    if (!overlaps) {
      availableSlots.push(minutesToTime(slotStart));
    }
  }

  return {
    slots: availableSlots,
    reason: availableSlots.length === 0 ? 'Няма свободни часове за тази дата' : undefined,
  };
}

