import {
  Service,
  WorkingHour,
  DayOff,
  Appointment,
  ClinicSettings,
  AppointmentStatus,
  DayOfWeek,
} from '@/types/database';
import {
  initialClinicSettings,
  initialServices,
  initialWorkingHours,
  initialDaysOff,
  initialAppointments,
} from './data/initialData';
import { supabase, isSupabaseConfigured } from './supabase/client';

const STORAGE_KEYS = {
  SETTINGS: 'dent_targovishte_settings',
  SERVICES: 'dent_targovishte_services',
  WORKING_HOURS: 'dent_targovishte_working_hours',
  DAYS_OFF: 'dent_targovishte_days_off',
  APPOINTMENTS: 'dent_targovishte_appointments',
};

function getLocalItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('dent_data_updated'));
  } catch (err) {
    console.error('LocalStorage write error:', err);
  }
}

// ==========================================
// 1. НАСТРОЙКИ НА КАБИНЕТА
// ==========================================
export async function getClinicSettings(): Promise<ClinicSettings> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('clinic_settings').select('*').limit(1).single();
    if (!error && data) return data;
  }
  return getLocalItem<ClinicSettings>(STORAGE_KEYS.SETTINGS, initialClinicSettings);
}

export async function updateClinicSettings(settings: Partial<ClinicSettings>): Promise<ClinicSettings> {
  const current = await getClinicSettings();
  const updated = { ...current, ...settings };

  if (isSupabaseConfigured && supabase) {
    await supabase.from('clinic_settings').upsert(updated);
  }
  setLocalItem(STORAGE_KEYS.SETTINGS, updated);
  return updated;
}

// ==========================================
// 2. ДЕНТАЛНИ УСЛУГИ
// ==========================================
export async function getServices(): Promise<Service[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('services').select('*').order('sort_order', { ascending: true });
    if (!error && data && data.length > 0) return data;
  }
  return getLocalItem<Service[]>(STORAGE_KEYS.SERVICES, initialServices);
}

export async function addService(serviceData: Omit<Service, 'id' | 'created_at'>): Promise<Service> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('services').insert(serviceData).select().single();
    if (!error && data) {
      const services = await getServices();
      setLocalItem(STORAGE_KEYS.SERVICES, [...services, data]);
      return data;
    }
  }

  const newService: Service = {
    ...serviceData,
    id: `srv-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  const services = await getServices();
  const updated = [...services, newService];
  setLocalItem(STORAGE_KEYS.SERVICES, updated);
  return newService;
}

export async function updateService(id: string, updates: Partial<Service>): Promise<Service | null> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from('services').update(updates).eq('id', id).select().single();
    if (data) {
      const services = await getServices();
      setLocalItem(STORAGE_KEYS.SERVICES, services.map((s) => (s.id === id ? data : s)));
      return data;
    }
  }

  const services = await getServices();
  const index = services.findIndex((s) => s.id === id);
  if (index === -1) return null;

  services[index] = { ...services[index], ...updates };
  setLocalItem(STORAGE_KEYS.SERVICES, [...services]);
  return services[index];
}

export async function deleteService(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('services').delete().eq('id', id);
  }

  const services = await getServices();
  const filtered = services.filter((s) => s.id !== id);
  setLocalItem(STORAGE_KEYS.SERVICES, filtered);
  return true;
}

// ==========================================
// 3. РАБОТНО ВРЕМЕ
// ==========================================
export async function getWorkingHours(): Promise<WorkingHour[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('working_hours').select('*').order('day_of_week', { ascending: true });
    if (!error && data && data.length > 0) return data;
  }
  return getLocalItem<WorkingHour[]>(STORAGE_KEYS.WORKING_HOURS, initialWorkingHours);
}

export async function updateWorkingHour(day_of_week: DayOfWeek, updates: Partial<WorkingHour>): Promise<WorkingHour | null> {
  const hours = await getWorkingHours();
  const index = hours.findIndex((h) => h.day_of_week === day_of_week);
  if (index === -1) return null;

  hours[index] = { ...hours[index], ...updates };

  if (isSupabaseConfigured && supabase) {
    await supabase.from('working_hours').upsert(hours[index]);
  }

  setLocalItem(STORAGE_KEYS.WORKING_HOURS, [...hours]);
  return hours[index];
}

// ==========================================
// 4. ПОЧИВНИ ДНИ И ОТПУСКИ
// ==========================================
export async function getDaysOff(): Promise<DayOff[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('days_off').select('*').order('start_date', { ascending: true });
    if (!error && data) return data;
  }
  return getLocalItem<DayOff[]>(STORAGE_KEYS.DAYS_OFF, initialDaysOff);
}

export async function addDayOff(dayOffData: Omit<DayOff, 'id' | 'created_at'>): Promise<DayOff> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('days_off').insert(dayOffData).select().single();
    if (!error && data) {
      const daysOff = await getDaysOff();
      setLocalItem(STORAGE_KEYS.DAYS_OFF, [...daysOff, data]);
      return data;
    }
  }

  const newDayOff: DayOff = {
    ...dayOffData,
    id: `dayoff-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  const daysOff = await getDaysOff();
  const updated = [...daysOff, newDayOff];
  setLocalItem(STORAGE_KEYS.DAYS_OFF, updated);
  return newDayOff;
}

export async function deleteDayOff(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('days_off').delete().eq('id', id);
  }

  const daysOff = await getDaysOff();
  const filtered = daysOff.filter((d) => d.id !== id);
  setLocalItem(STORAGE_KEYS.DAYS_OFF, filtered);
  return true;
}

// ==========================================
// 5. РЕЗЕРВАЦИИ / ЧАСОВЕ (APPOINTMENTS)
// ==========================================
export async function getAppointments(): Promise<Appointment[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('appointments').select('*').order('date', { ascending: true });
    if (!error && data) return data;
  }
  return getLocalItem<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, initialAppointments);
}

export async function addAppointment(
  appointmentData: Omit<Appointment, 'id' | 'created_at' | 'reminder_sent'>
): Promise<Appointment> {
  if (isSupabaseConfigured && supabase) {
    const insertPayload: any = {
      ...appointmentData,
      reminder_sent: false,
    };

    // Проверка за валиден UUID за service_id
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      insertPayload.service_id
    );
    if (!isUUID) {
      delete insertPayload.service_id;
    }

    const { data, error } = await supabase.from('appointments').insert(insertPayload).select().single();
    if (!error && data) {
      const appointments = await getAppointments();
      setLocalItem(STORAGE_KEYS.APPOINTMENTS, [data, ...appointments]);
      return data;
    }
    if (error) {
      console.error('Supabase addAppointment error:', error);
    }
  }

  const newAppointment: Appointment = {
    ...appointmentData,
    id: `apt-${Date.now()}`,
    reminder_sent: false,
    created_at: new Date().toISOString(),
  };

  const appointments = await getAppointments();
  const updated = [newAppointment, ...appointments];
  setLocalItem(STORAGE_KEYS.APPOINTMENTS, updated);
  return newAppointment;
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('appointments').update({ status }).eq('id', id);
  }

  const appointments = await getAppointments();
  const updated = appointments.map((apt) => (apt.id === id ? { ...apt, status } : apt));
  setLocalItem(STORAGE_KEYS.APPOINTMENTS, updated);
  return true;
}

export async function deleteAppointment(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('appointments').delete().eq('id', id);
  }

  const appointments = await getAppointments();
  const updated = appointments.filter((apt) => apt.id !== id);
  setLocalItem(STORAGE_KEYS.APPOINTMENTS, updated);
  return true;
}

export async function sendAppointmentReminder(id: string): Promise<{ success: boolean; message: string }> {
  const appointments = await getAppointments();
  const appointment = appointments.find((a) => a.id === id);

  if (!appointment) {
    return { success: false, message: 'Часът не е намерен.' };
  }

  if (isSupabaseConfigured && supabase) {
    await supabase.from('appointments').update({ reminder_sent: true }).eq('id', id);
  }

  const updated = appointments.map((apt) => (apt.id === id ? { ...apt, reminder_sent: true } : apt));
  setLocalItem(STORAGE_KEYS.APPOINTMENTS, updated);

  return {
    success: true,
    message: `Успешно изпратено напомняне до ${appointment.patient_name} (${appointment.patient_phone || appointment.patient_email || 'Пациент'})`,
  };
}

// ==========================================
// 6. АЛГОРИТЪМ ЗА ИЗЧИСЛЯВАНЕ НА СВОБОДНИ ЧАСОВЕ
// ==========================================
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export async function getAvailableSlots(
  dateStr: string,
  durationMinutes: number
): Promise<{ slots: string[]; reason?: string }> {
  const dateObj = new Date(dateStr);
  const dayOfWeek = dateObj.getDay() as DayOfWeek;

  // 1. Почивни дни / отпуски
  const daysOff = await getDaysOff();
  const matchingDayOff = daysOff.find((d) => dateStr >= d.start_date && dateStr <= d.end_date);
  if (matchingDayOff) {
    return {
      slots: [],
      reason: `Неработен ден (${matchingDayOff.reason})`,
    };
  }

  // 2. Работно време
  const workingHours = await getWorkingHours();
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
  const allAppointments = await getAppointments();
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
  const slotInterval = 15;
  const availableSlots: string[] = [];

  const now = new Date();
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
