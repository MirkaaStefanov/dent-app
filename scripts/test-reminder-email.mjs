import { randomUUID } from 'node:crypto';
import { sendReminder } from '../netlify/functions/_shared/reminders.ts';

// The unverified Resend sender can only send to the account owner's address.
// Synthetic content: no patient records are read or changed.
if (!process.env.RESEND_API_KEY) {
  console.error('Добавете RESEND_API_KEY в .env.local. Не записвайте ключа в Git или чат.');
  process.exit(1);
}
const scheduled = new Date(Date.now() + 86400000);
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sofia', year: 'numeric', month: '2-digit', day: '2-digit' }).format(scheduled);
const result = await sendReminder(
  { id: randomUUID(), appointment_id: randomUUID(), channel: 'email', scheduled_start: scheduled.toISOString(), attempts: 1 },
  { patient_name: 'Тест — това не е реален записан час', patient_email: 'mirkanstefanov2007@gmail.com', patient_phone: '', date, start_time: '10:00', status: 'confirmed', notification_consent: true },
  { doctor_name: 'Д-р Джанел Аяз (тест)', city: 'Търговище', address: 'Тестово известие', phone: 'Не е необходим отговор' },
  { enabled: true, channels: ['email'], resendKey: process.env.RESEND_API_KEY, emailFrom: 'Dent test <onboarding@resend.dev>' },
);
if (result.status !== 'accepted') {
  console.error('Тестът не е приет от Resend:', result.errorCode || result.status);
  process.exit(1);
}
console.log('Resend прие тестовия имейл. Проверете пощата и Spam; приемането не доказва доставка.');
