// A one-click "reserved" slot is an ordinary admin appointment with a marker in the notes.
// Public booking already hides every non-cancelled appointment, so no schema change is needed.
export const RESERVED_SLOT_NAME = 'Запазен час';
export const RESERVED_SLOT_PHONE = '—';
export const RESERVED_SLOT_NOTE = '[Запазен час]';

export function isReservedSlot(apt: { notes?: string | null; booked_by?: string }): boolean {
  return apt.booked_by === 'admin' && (apt.notes ?? '').startsWith(RESERVED_SLOT_NOTE);
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function buildReservedSlot(input: {
  service: { id: string; title: string; duration_minutes: number; price_bgn: number | null };
  date: string;
  time: string;
}) {
  return {
    service_id: input.service.id,
    service_title: input.service.title,
    service_duration: input.service.duration_minutes,
    service_price: input.service.price_bgn ?? undefined,
    patient_name: RESERVED_SLOT_NAME,
    patient_phone: RESERVED_SLOT_PHONE,
    date: input.date,
    start_time: input.time,
    end_time: addMinutesToTime(input.time, input.service.duration_minutes),
    status: 'confirmed' as const,
    notification_consent: false,
    notes: RESERVED_SLOT_NOTE,
    booked_by: 'admin' as const,
  };
}
