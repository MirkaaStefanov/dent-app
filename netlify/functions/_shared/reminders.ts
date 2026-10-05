export type Channel = 'email' | 'sms';
export type SenderConfig = {
  enabled: boolean; channels: Channel[];
  resendKey?: string; emailFrom?: string;
  twilioSid?: string; twilioToken?: string; smsFrom?: string;
};
export type ReminderJob = { id: string; appointment_id: string; channel: Channel; scheduled_start: string; attempts: number };
export type ReminderAppointment = { patient_name: string; patient_email?: string; patient_phone: string; date: string; start_time: string; status: string; notification_consent: boolean };
export type Clinic = { doctor_name: string; city: string; address: string; phone: string };
export type SendResult = { status: 'accepted' | 'failed' | 'unknown'; providerId?: string; errorCode?: string; retryable?: boolean };

export function normalizePhone(value: string): string | null {
  let phone = value.replace(/[\s().-]/g, '');
  if (phone.startsWith('00')) phone = `+${phone.slice(2)}`;
  else if (/^0\d{9}$/.test(phone)) phone = `+359${phone.slice(1)}`;
  else if (/^359\d{9}$/.test(phone)) phone = `+${phone}`;
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

export function reminderText(appointment: ReminderAppointment, clinic: Clinic): string {
  const date = new Date(`${appointment.date}T12:00:00`).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Sofia' });
  return `Здравейте, ${appointment.patient_name.replace(/\s+/g, ' ').slice(0, 80)}. Напомняме Ви за часа при ${clinic.doctor_name} на ${date} от ${appointment.start_time.slice(0, 5)} ч. Адрес: ${clinic.city}, ${clinic.address}. При промяна се обадете на ${clinic.phone}.`;
}

export async function sendReminder(job: ReminderJob, appointment: ReminderAppointment, clinic: Clinic, config: SenderConfig, request: typeof fetch = fetch): Promise<SendResult> {
  const text = reminderText(appointment, clinic);
  let response: Response;
  try {
    if (job.channel === 'email') {
      if (!config.resendKey || !config.emailFrom) return { status: 'failed', errorCode: 'email_not_configured' };
      if (!appointment.patient_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(appointment.patient_email)) return { status: 'failed', errorCode: 'invalid_email' };
      response = await request('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(6000), headers: { Authorization: `Bearer ${config.resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `appointment-reminder/${job.id}` }, body: JSON.stringify({ from: config.emailFrom, to: [appointment.patient_email], subject: `Напомняне за Вашия час · ${clinic.doctor_name}`, text }) });
    } else {
      if (!config.twilioSid || !config.twilioToken || !config.smsFrom) return { status: 'failed', errorCode: 'sms_not_configured' };
      const phone = normalizePhone(appointment.patient_phone);
      if (!phone) return { status: 'failed', errorCode: 'invalid_phone' };
      response = await request(`https://api.twilio.com/2010-04-01/Accounts/${config.twilioSid}/Messages.json`, { method: 'POST', signal: AbortSignal.timeout(6000), headers: { Authorization: `Basic ${Buffer.from(`${config.twilioSid}:${config.twilioToken}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ To: phone, From: config.smsFrom, Body: text }).toString() });
    }
    if (!response.ok) {
      // 5xx SMS results are ambiguous; a fresh submission could duplicate a message.
      const ambiguous = job.channel === 'sms' && response.status >= 500;
      return { status: ambiguous ? 'unknown' : 'failed', errorCode: `provider_http_${response.status}`, retryable: !ambiguous && (response.status === 429 || response.status >= 500) };
    }
    const result = await response.json() as { id?: string; sid?: string; status?: string };
    const providerId = job.channel === 'email' ? result.id : result.sid;
    if (!providerId) return { status: 'unknown', errorCode: 'missing_provider_receipt' };
    if (job.channel === 'sms' && ['failed', 'undelivered', 'canceled'].includes(result.status || '')) return { status: 'failed', errorCode: 'sms_rejected' };
    return { status: 'accepted', providerId };
  } catch {
    return job.channel === 'email' ? { status: 'failed', errorCode: 'email_network_error', retryable: true } : { status: 'unknown', errorCode: 'sms_network_error' };
  }
}
