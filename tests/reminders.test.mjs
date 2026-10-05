import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, reminderText, sendReminder } from '../netlify/functions/_shared/reminders.ts';

const appointment = { patient_name: 'Тест', patient_email: 'test@example.com', patient_phone: '0888 123 456', date: '2026-10-27', start_time: '09:30:00', status: 'confirmed', notification_consent: true };
const clinic = { doctor_name: 'Д-р Тест', city: 'Търговище', address: 'Тестов адрес', phone: '0888000000' };
const config = { enabled: true, channels: ['email', 'sms'], resendKey: 'mock', emailFrom: 'Clinic <test@example.com>', twilioSid: 'mock', twilioToken: 'mock', smsFrom: '+359888000000' };
const job = { id: 'test-job', appointment_id: 'test-appointment', channel: 'email', scheduled_start: '2026-10-27T07:30:00Z', attempts: 1 };

test('normalizes Bulgarian and international numbers, rejects malformed input', () => {
  assert.equal(normalizePhone('0888 123 456'), '+359888123456');
  assert.equal(normalizePhone('00359 888 123 456'), '+359888123456');
  assert.equal(normalizePhone('+44 (7700) 900-123'), '+447700900123');
  assert.equal(normalizePhone('abc'), null);
});
test('reminder contains actual date instead of claiming every booking is tomorrow', () => {
  const text = reminderText(appointment, clinic);
  assert.match(text, /27 октомври 2026/);
  assert.match(text, /09:30/);
  assert.doesNotMatch(text, /утре/);
});
test('email retries use the same provider idempotency key', async () => {
  const keys = [];
  const mock = async (_url, request) => { keys.push(request.headers['Idempotency-Key']); return Response.json({ id: 'provider-email' }); };
  for (let i = 0; i < 2; i++) assert.equal((await sendReminder(job, appointment, clinic, config, mock)).status, 'accepted');
  assert.deepEqual(keys, ['appointment-reminder/test-job', 'appointment-reminder/test-job']);
});
test('missing configuration does not pretend to send or call a provider', async () => {
  const result = await sendReminder(job, appointment, clinic, { enabled: true, channels: [] }, () => { throw new Error('must not call'); });
  assert.equal(result.status, 'failed'); assert.equal(result.errorCode, 'email_not_configured');
});
test('invalid numbers never reach the SMS provider', async () => {
  const result = await sendReminder({ ...job, channel: 'sms' }, { ...appointment, patient_phone: 'invalid' }, clinic, config, () => { throw new Error('must not call'); });
  assert.equal(result.errorCode, 'invalid_phone');
});
test('ambiguous SMS network outcomes are not automatically retried', async () => {
  const result = await sendReminder({ ...job, channel: 'sms' }, appointment, clinic, config, async () => { throw new Error('timeout'); });
  assert.equal(result.status, 'unknown'); assert.notEqual(result.retryable, true);
});
test('rate limiting is retryable, provider rejection is not a success', async () => {
  const result = await sendReminder(job, appointment, clinic, config, async () => new Response('', { status: 429 }));
  assert.equal(result.status, 'failed'); assert.equal(result.retryable, true);
});
test('SMS provider receipt is acceptance, not delivery', async () => {
  const result = await sendReminder({ ...job, channel: 'sms' }, appointment, clinic, config, async () => Response.json({ sid: 'test-sid', status: 'queued' }));
  assert.deepEqual(result, { status: 'accepted', providerId: 'test-sid' });
});
