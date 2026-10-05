import { calculateAvailableSlots } from './availability';
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

// ==========================================
// CIRCUIT BREAKER & FAST TIMEOUT ЗА SUPABASE
// ==========================================
let isSupabaseOnline = true;
let lastFailureTimestamp = 0;
const OFFLINE_COOLDOWN_MS = 15000; // 15 секунди при грешка преди повторен опит
const DEFAULT_TIMEOUT_MS = 4000; // 4.0 секунди за мрежова заявка (предвидени за студен старт)

/**
 * Изпълнява заявка към Supabase с твърд таймаут.
 * Ако мрежата е бавна, офлайн или домейнът не съществува,
 * не блокира потребителя за 10 секунди, а превключва мигновено на локален кеш.
 */
async function runWithTimeout<T>(
  promiseFactory: () => PromiseLike<T | null>,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  // Ако Supabase наскоро е отпаднал, не бавим потребителя - директно връщаме null
  if (!isSupabaseOnline && Date.now() - lastFailureTimestamp < OFFLINE_COOLDOWN_MS) {
    return null;
  }

  try {
    let timerId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<null>((resolve) => {
      timerId = setTimeout(() => resolve(null), timeoutMs);
    });

    const execPromise = Promise.resolve().then(() => promiseFactory());
    const result = await Promise.race([execPromise, timeoutPromise]);
    clearTimeout(timerId);

    if (result === null) {
      isSupabaseOnline = false;
      lastFailureTimestamp = Date.now();
      console.warn(`[Supabase] Заявката надхвърли ${timeoutMs}ms таймаут. Превключване към мигновен локален кеш.`);
      return null;
    }

    isSupabaseOnline = true;
    return result as T;
  } catch (err) {
    isSupabaseOnline = false;
    lastFailureTimestamp = Date.now();
    console.warn('[Supabase] Мрежова грешка (офлайн/паузиран):', err);
    return null;
  }
}

function getLocalItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch {
    return fallback;
  }
}

function setLocalItem<T>(key: string, value: T, dispatchEvent = true): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (dispatchEvent) {
      window.dispatchEvent(new Event('dent_data_updated'));
    }
  } catch (err) {
    console.error('LocalStorage write error:', err);
  }
}

// ==========================================
// 1. НАСТРОЙКИ НА КАБИНЕТА
// ==========================================
export async function getClinicSettings(): Promise<ClinicSettings> {
  const local = getLocalItem<ClinicSettings>(STORAGE_KEYS.SETTINGS, initialClinicSettings);

  const res = await runWithTimeout<ClinicSettings>(async () => {
    const { data, error } = await supabase!.from('clinic_settings').select('*').limit(1).maybeSingle();
    if (!error && data) return data as ClinicSettings;
    return null;
  });

  if (res) {
    setLocalItem(STORAGE_KEYS.SETTINGS, res, false);
    return res;
  }

  return local;
}

export async function updateClinicSettings(settings: Partial<ClinicSettings>): Promise<ClinicSettings> {
  const current = getLocalItem<ClinicSettings>(STORAGE_KEYS.SETTINGS, initialClinicSettings);
  const updated = { ...current, ...settings };
  setLocalItem(STORAGE_KEYS.SETTINGS, updated, true);

  // Синхронизация на заден план
  runWithTimeout(() => supabase!.from('clinic_settings').upsert(updated)).catch(() => {});
  return updated;
}

// ==========================================
// 2. ДЕНТАЛНИ УСЛУГИ
// ==========================================
export async function getServices(): Promise<Service[]> {
  const local = getLocalItem<Service[]>(STORAGE_KEYS.SERVICES, initialServices);

  const res = await runWithTimeout<Service[]>(async () => {
    const { data, error } = await supabase!.from('services').select('*').order('sort_order', { ascending: true });
    if (!error && data && data.length > 0) return data as Service[];
    return null;
  });

  if (res) {
    setLocalItem(STORAGE_KEYS.SERVICES, res, false);
    return res;
  }

  return local;
}

export async function addService(serviceData: Omit<Service, 'id' | 'created_at'>): Promise<Service> {
  const newService: Service = {
    ...serviceData,
    id: `srv-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  const current = getLocalItem<Service[]>(STORAGE_KEYS.SERVICES, initialServices);
  const updated = [...current, newService];
  setLocalItem(STORAGE_KEYS.SERVICES, updated, true);

  // Опит за запис в Supabase на заден план
  runWithTimeout(async () => {
    const { data } = await supabase!.from('services').insert(serviceData).select().single();
    if (data) {
      const refreshed = getLocalItem<Service[]>(STORAGE_KEYS.SERVICES, initialServices);
      setLocalItem(
        STORAGE_KEYS.SERVICES,
        refreshed.map((s) => (s.id === newService.id ? data : s)),
        false
      );
    }
  }).catch(() => {});

  return newService;
}

export async function updateService(id: string, updates: Partial<Service>): Promise<Service | null> {
  const current = getLocalItem<Service[]>(STORAGE_KEYS.SERVICES, initialServices);
  const index = current.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const updatedService = { ...current[index], ...updates };
  current[index] = updatedService;
  setLocalItem(STORAGE_KEYS.SERVICES, [...current], true);

  // Опит за обновяване в Supabase на заден план без блокиране
  runWithTimeout(() => supabase!.from('services').update(updates).eq('id', id)).catch(() => {});

  return updatedService;
}

export async function deleteService(id: string): Promise<boolean> {
  const current = getLocalItem<Service[]>(STORAGE_KEYS.SERVICES, initialServices);
  const filtered = current.filter((s) => s.id !== id);
  setLocalItem(STORAGE_KEYS.SERVICES, filtered, true);

  runWithTimeout(() => supabase!.from('services').delete().eq('id', id)).catch(() => {});
  return true;
}

// ==========================================
// 3. РАБОТНО ВРЕМЕ
// ==========================================
export async function getWorkingHours(): Promise<WorkingHour[]> {
  const local = getLocalItem<WorkingHour[]>(STORAGE_KEYS.WORKING_HOURS, initialWorkingHours);

  const res = await runWithTimeout<WorkingHour[]>(async () => {
    const { data, error } = await supabase!.from('working_hours').select('*').order('day_of_week', { ascending: true });
    if (!error && data && data.length > 0) {
      const normalized = (data as WorkingHour[]).map((wh) => ({
        ...wh,
        start_time: wh.start_time ? String(wh.start_time).slice(0, 5) : '09:00',
        end_time: wh.end_time ? String(wh.end_time).slice(0, 5) : '18:00',
        break_start: wh.break_start ? String(wh.break_start).slice(0, 5) : null,
        break_end: wh.break_end ? String(wh.break_end).slice(0, 5) : null,
      }));
      return normalized as WorkingHour[];
    }
    return null;
  });

  if (res) {
    setLocalItem(STORAGE_KEYS.WORKING_HOURS, res, false);
    return res;
  }

  return local;
}

export async function updateWorkingHour(day_of_week: DayOfWeek, updates: Partial<WorkingHour>): Promise<WorkingHour | null> {
  const current = getLocalItem<WorkingHour[]>(STORAGE_KEYS.WORKING_HOURS, initialWorkingHours);
  const index = current.findIndex((h) => h.day_of_week === day_of_week);
  if (index === -1) return null;

  current[index] = { ...current[index], ...updates };
  setLocalItem(STORAGE_KEYS.WORKING_HOURS, [...current], false);

  const updatePayload: Partial<WorkingHour> = { ...updates };
  delete updatePayload.id;
  delete updatePayload.day_of_week;

  runWithTimeout(async () => {
    if (!supabase) return null;
    const { error } = await supabase
      .from('working_hours')
      .update(updatePayload)
      .eq('day_of_week', day_of_week);
    if (error) {
      console.warn('[Supabase] Грешка при обновяване на работно време:', error);
    }
    return true;
  }).catch(() => {});

  return current[index];
}

// ==========================================
// 4. ПОЧИВНИ ДНИ И ОТПУСКИ
// ==========================================
export async function getDaysOff(): Promise<DayOff[]> {
  const local = getLocalItem<DayOff[]>(STORAGE_KEYS.DAYS_OFF, initialDaysOff);

  const res = await runWithTimeout<DayOff[]>(async () => {
    const { data, error } = await supabase!.from('days_off').select('*').order('start_date', { ascending: true });
    if (!error && data) return data as DayOff[];
    return null;
  });

  if (res) {
    setLocalItem(STORAGE_KEYS.DAYS_OFF, res, false);
    return res;
  }

  return local;
}

export async function addDayOff(dayOffData: Omit<DayOff, 'id' | 'created_at'>): Promise<DayOff> {
  const newDayOff: DayOff = {
    ...dayOffData,
    id: `dayoff-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  const current = getLocalItem<DayOff[]>(STORAGE_KEYS.DAYS_OFF, initialDaysOff);
  setLocalItem(STORAGE_KEYS.DAYS_OFF, [...current, newDayOff], true);

  runWithTimeout(async () => {
    const { data } = await supabase!.from('days_off').insert(dayOffData).select().single();
    if (data) {
      const refreshed = getLocalItem<DayOff[]>(STORAGE_KEYS.DAYS_OFF, initialDaysOff);
      setLocalItem(
        STORAGE_KEYS.DAYS_OFF,
        refreshed.map((d) => (d.id === newDayOff.id ? data : d)),
        false
      );
    }
  }).catch(() => {});

  return newDayOff;
}

export async function deleteDayOff(id: string): Promise<boolean> {
  const current = getLocalItem<DayOff[]>(STORAGE_KEYS.DAYS_OFF, initialDaysOff);
  const filtered = current.filter((d) => d.id !== id);
  setLocalItem(STORAGE_KEYS.DAYS_OFF, filtered, true);

  runWithTimeout(() => supabase!.from('days_off').delete().eq('id', id)).catch(() => {});
  return true;
}

// ==========================================
// 5. РЕЗЕРВАЦИИ / ЧАСОВЕ (APPOINTMENTS)
// ==========================================
export async function getAppointments(): Promise<Appointment[]> {
  const local = getLocalItem<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, initialAppointments);

  const res = await runWithTimeout<Appointment[]>(async () => {
    const { data, error } = await supabase!.from('appointments').select('*').order('date', { ascending: true });
    if (!error && data) {
      const services = getLocalItem<Service[]>(STORAGE_KEYS.SERVICES, initialServices);
      const enriched: Appointment[] = (data as Appointment[]).map((apt) => {
        const srv = services.find((s) => s.id === apt.service_id);
        const startTime = apt.start_time ? String(apt.start_time).slice(0, 5) : apt.start_time;
        const endTime = apt.end_time ? String(apt.end_time).slice(0, 5) : apt.end_time;
        return {
          ...apt,
          start_time: startTime,
          end_time: endTime,
          service_title: apt.service_title || srv?.title || 'Стоматологична процедура',
          service_duration: apt.service_duration || srv?.duration_minutes || 30,
          service_price: apt.service_price !== undefined && apt.service_price !== null ? apt.service_price : srv?.price_bgn || 0,
        };
      });
      return enriched;
    }
    return null;
  });

  if (res) {
    setLocalItem(STORAGE_KEYS.APPOINTMENTS, res, false);
    return res;
  }

  return local;
}

export async function addAppointment(
  appointmentData: Omit<Appointment, 'id' | 'created_at' | 'reminder_sent'>
): Promise<Appointment> {
  const createdApt: Appointment = {
    ...appointmentData,
    id: `apt-${Date.now()}`,
    reminder_sent: false,
    created_at: new Date().toISOString(),
  };

  const current = getLocalItem<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, initialAppointments);
  const updated = [createdApt, ...current.filter((a) => a.id !== createdApt.id)];
  setLocalItem(STORAGE_KEYS.APPOINTMENTS, updated, true);

  // Опит за запис в Supabase на заден план (не блокира потвърждението на пациента)
  runWithTimeout(async () => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      appointmentData.service_id
    );

    const basePayload: Record<string, string | number | boolean | null | undefined> = {
      patient_name: appointmentData.patient_name,
      patient_phone: appointmentData.patient_phone,
      patient_email: appointmentData.patient_email || null,
      date: appointmentData.date,
      start_time: appointmentData.start_time,
      end_time: appointmentData.end_time,
      status: appointmentData.status || 'confirmed',
      notes: appointmentData.notes || null,
      booked_by: appointmentData.booked_by || 'patient',
      reminder_sent: false,
    };
    if (isUUID) {
      basePayload.service_id = appointmentData.service_id;
    }

    const fullPayload: Record<string, string | number | boolean | null | undefined> = {
      ...basePayload,
      service_title: appointmentData.service_title,
      service_duration: appointmentData.service_duration,
      service_price: appointmentData.service_price,
    };

    let insertRes = await supabase!.from('appointments').insert(fullPayload).select().maybeSingle();
    if (insertRes.error && insertRes.error.code === 'PGRST204') {
      insertRes = await supabase!.from('appointments').insert(basePayload).select().maybeSingle();
    }
    if (insertRes.error && insertRes.error.code === '42501') {
      await supabase!.from('appointments').insert(basePayload);
    }
  }).catch(() => {});

  return createdApt;
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<boolean> {
  const current = getLocalItem<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, initialAppointments);
  const updated = current.map((apt) => (apt.id === id ? { ...apt, status } : apt));
  setLocalItem(STORAGE_KEYS.APPOINTMENTS, updated, true);

  runWithTimeout(() => supabase!.from('appointments').update({ status }).eq('id', id)).catch(() => {});
  return true;
}

export async function deleteAppointment(id: string): Promise<boolean> {
  const current = getLocalItem<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, initialAppointments);
  const updated = current.filter((apt) => apt.id !== id);
  setLocalItem(STORAGE_KEYS.APPOINTMENTS, updated, true);

  runWithTimeout(() => supabase!.from('appointments').delete().eq('id', id)).catch(() => {});
  return true;
}

export async function sendAppointmentReminder(id: string): Promise<{ success: boolean; message: string }> {
  const appointments = getLocalItem<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, initialAppointments);
  const appointment = appointments.find((a) => a.id === id);

  if (!appointment) {
    return { success: false, message: 'Часът не е намерен.' };
  }

  const updated = appointments.map((apt) => (apt.id === id ? { ...apt, reminder_sent: true } : apt));
  setLocalItem(STORAGE_KEYS.APPOINTMENTS, updated, true);

  runWithTimeout(() => supabase!.from('appointments').update({ reminder_sent: true }).eq('id', id)).catch(() => {});

  return { success: true, message: 'Напомнянето е регистрирано успешно.' };
}

// ==========================================
// 6. АЛГОРИТЪМ ЗА ИЗЧИСЛЯВАНЕ НА СВОБОДНИ ЧАСОВЕ
// ==========================================
export async function getAvailableSlots(
  dateStr: string,
  durationMinutes: number
): Promise<{ slots: string[]; reason?: string }> {
  const [daysOff, workingHours, appointments, settings] = await Promise.all([
    getDaysOff(), getWorkingHours(), getAppointments(), getClinicSettings(),
  ]);
  return calculateAvailableSlots({ date: dateStr, duration: durationMinutes, workingHours,
    daysOff, appointments, interval: settings.slot_interval_minutes });
}

// ==========================================
// 7. СИНХРОНИЗАЦИЯ С ОБЛАКА (SUPABASE SYNC)
// ==========================================
export async function syncWithSupabase(): Promise<{ synced: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { synced: false, message: 'Supabase не е конфигуриран.' };
  }

  // Нулираме евентуален предходен офлайн статус за ръчната проверка
  isSupabaseOnline = true;
  lastFailureTimestamp = 0;

  // 1. Проверяваме дали Supabase е събуден и отговаря
  const isAlive = await runWithTimeout(async () => {
    const { error } = await supabase!.from('clinic_settings').select('id').limit(1);
    return !error;
  }, 5000);

  if (!isAlive) {
    return {
      synced: false,
      message: 'Базата данни в Supabase все още стартира или е паузирана. Моля, изчакайте няколко секунди или натиснете Restore в панела на Supabase.',
    };
  }

  try {
    // 2. Синхронизираме часовете
    const localAppointments = getLocalItem<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
    const { data: remoteAppointments } = await supabase.from('appointments').select('*').order('date', { ascending: true });

    if (remoteAppointments) {
      const remoteIds = new Set((remoteAppointments as Appointment[]).map((a) => a.id));

      for (const apt of localAppointments) {
        if (!remoteIds.has(apt.id)) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(apt.service_id);
          const payload: Record<string, string | number | boolean | null | undefined> = {
            patient_name: apt.patient_name,
            patient_phone: apt.patient_phone,
            patient_email: apt.patient_email || null,
            date: apt.date,
            start_time: apt.start_time,
            end_time: apt.end_time,
            status: apt.status || 'confirmed',
            notes: apt.notes || null,
            booked_by: apt.booked_by || 'patient',
            reminder_sent: Boolean(apt.reminder_sent),
          };
          if (isUUID) payload.service_id = apt.service_id;
          await supabase.from('appointments').insert(payload);
        }
      }

      const { data: finalRemote } = await supabase.from('appointments').select('*').order('date', { ascending: true });
      if (finalRemote && finalRemote.length > 0) {
        const services = getLocalItem<Service[]>(STORAGE_KEYS.SERVICES, initialServices);
        const enriched: Appointment[] = (finalRemote as Appointment[]).map((apt) => {
          const srv = services.find((s) => s.id === apt.service_id);
          return {
            ...apt,
            start_time: apt.start_time ? String(apt.start_time).slice(0, 5) : apt.start_time,
            end_time: apt.end_time ? String(apt.end_time).slice(0, 5) : apt.end_time,
            service_title: apt.service_title || srv?.title || 'Стоматологична процедура',
            service_duration: apt.service_duration || srv?.duration_minutes || 30,
            service_price: apt.service_price !== undefined && apt.service_price !== null ? apt.service_price : srv?.price_bgn || 0,
          };
        });
        setLocalItem(STORAGE_KEYS.APPOINTMENTS, enriched, true);
      }
    }

    return { synced: true, message: 'Всички данни бяха синхронизирани успешно с базата!' };
  } catch (err) {
    console.error('Sync error:', err);
    return { synced: false, message: 'Възникна грешка при синхронизацията.' };
  }
}
