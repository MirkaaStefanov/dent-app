export type Service = {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  price_bgn: number;
  is_active: boolean;
  category?: string;
  sort_order: number;
  created_at?: string;
};

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Неделя, 1 = Понеделник...

export type WorkingHour = {
  id: string;
  day_of_week: DayOfWeek;
  day_name: string;
  is_working: boolean;
  start_time: string; // "09:00"
  end_time: string; // "18:00"
  break_start?: string; // "13:00"
  break_end?: string; // "14:00"
};

export type DayOff = {
  id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  reason: string;
  is_full_day: boolean;
  created_at?: string;
};

export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export type Appointment = {
  id: string;
  service_id: string;
  service_title?: string;
  service_duration?: number;
  service_price?: number;
  patient_name: string;
  patient_phone: string;
  patient_email?: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  status: AppointmentStatus;
  notes?: string;
  booked_by: 'patient' | 'admin';
  reminder_sent: boolean;
  notification_consent?: boolean;
  created_at: string;
};

export type ClinicSettings = {
  id: string;
  doctor_name: string;
  title: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  slot_interval_minutes: number;
  reminder_hours_before: number;
};
