import type { Config, Context } from '@netlify/functions';
import { senderConfig, serverDatabase } from './_shared/config';
import { sendReminder, type ReminderJob, type ReminderAppointment, type Clinic } from './_shared/reminders';

const appointmentReminders = async (_request: Request, context: Context) => {
  // Scheduled jobs only send on the published production deploy, with explicit enablement.
  const config = senderConfig();
  if (!context.deploy.published || !config.enabled || !config.channels.length) return;
  const db = serverDatabase();
  if (!db) { console.error('Reminder configuration incomplete'); return; }
  const { data: clinic, error: clinicError } = await db.from('clinic_settings').select('doctor_name,city,address,phone').limit(1).single();
  if (clinicError || !clinic) { console.error('Reminder clinic lookup failed'); return; }
  const { data: jobs, error } = await db.rpc('claim_appointment_reminders', { p_channels: config.channels, p_limit: 10 });
  if (error) { console.error('Reminder queue unavailable'); return; }
  await Promise.all((jobs as ReminderJob[] || []).map(async job => {
    try {
      // Recheck the booking immediately before submitting a message.
      const { data: appointment, error: lookupError } = await db.from('appointments').select('patient_name,patient_email,patient_phone,date,start_time,status,notification_consent').eq('id', job.appointment_id).single();
      if (lookupError || !appointment) throw new Error('appointment_lookup_failed');
      const current = appointment as ReminderAppointment;
      const formatted = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Sofia', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(job.scheduled_start)).replace(' ', 'T');
      if (current.status !== 'confirmed' || !current.notification_consent || `${current.date}T${current.start_time.slice(0, 5)}` !== formatted || new Date(job.scheduled_start).getTime() <= Date.now()) {
        await db.from('appointment_notifications').update({ status: 'skipped', error_code: 'appointment_changed' }).eq('id', job.id); return;
      }
      const result = await sendReminder(job, current, clinic as Clinic, config);
      const { error: updateError } = await db.from('appointment_notifications').update({ status: result.status, provider_id: result.providerId || null, error_code: result.errorCode || null, accepted_at: result.status === 'accepted' ? new Date().toISOString() : null, attempts: result.retryable ? job.attempts : result.status === 'failed' ? 6 : job.attempts, next_attempt_at: new Date(Date.now() + Math.min(60, 5 * 2 ** job.attempts) * 60000).toISOString() }).eq('id', job.id);
      if (updateError) throw new Error('receipt_save_failed');
      if (result.status === 'accepted') await db.from('appointments').update({ reminder_sent: true }).eq('id', job.appointment_id).eq('date', current.date).eq('start_time', current.start_time).eq('status', 'confirmed');
    } catch { console.error('Reminder processing failed; queue will preserve submission state'); }
  }));
};
export default appointmentReminders;
export const config: Config = { schedule: '*/5 * * * *' };
