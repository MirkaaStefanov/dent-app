export const ADMIN_APPOINTMENT_RETURN_KEY = 'dent_admin_appointment_return';
export type AppointmentTarget = { id: string; date?: string };

export function parseAppointmentTarget(search: string): AppointmentTarget | null {
  const params = new URLSearchParams(search);
  const id = params.get('appointment');
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const date = params.get('date');
  const validDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
  return { id: id.toLowerCase(), ...(validDate ? { date } : {}) };
}

export function appointmentTargetUrl(target: AppointmentTarget): string {
  const params = new URLSearchParams({ appointment: target.id });
  if (target.date) params.set('date', target.date);
  return `/admin/?${params}#schedule`;
}

export function safeAppointmentReturnUrl(value: string | null): string | null {
  if (!value || !value.startsWith('/admin/?')) return null;
  const target = parseAppointmentTarget(value.slice('/admin/'.length).split('#')[0]);
  return target ? appointmentTargetUrl(target) : null;
}
