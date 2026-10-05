import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAvailableSlots } from '../src/lib/availability.ts';

const schedule = { id: 'monday', day_of_week: 1, is_working: true, start_time: '09:00', end_time: '12:00', break_start: '10:00', break_end: '10:30' };
const options = { date: '2026-10-05', duration: 30, workingHours: [schedule], daysOff: [], appointments: [], now: new Date(2026, 9, 4, 12) };
const slots = extra => calculateAvailableSlots({ ...options, ...extra }).slots;
const appointment = extra => ({ date: options.date, start_time: '11:00:00', end_time: '11:45:00', status: 'confirmed', ...extra });

test('respects breaks and exact end-of-day boundaries', () => {
  assert.deepEqual(slots(), ['09:00', '09:15', '09:30', '10:30', '10:45', '11:00', '11:15', '11:30']);
});
test('checks the whole procedure against an overlapping appointment', () => {
  assert.deepEqual(slots({ appointments: [appointment()] }), ['09:00', '09:15', '09:30', '10:30']);
});
test('cancelled appointments free time, completed appointments keep time occupied', () => {
  assert.deepEqual(slots({ appointments: [appointment({ status: 'cancelled' })] }), slots());
  assert.deepEqual(slots({ appointments: [appointment({ status: 'completed' })] }), slots({ appointments: [appointment()] }));
});
test('uses configured intervals and procedure duration', () => {
  assert.deepEqual(slots({ interval: 30, duration: 60 }), ['09:00', '10:30', '11:00']);
});
test('days off and non-working weekdays have no slots', () => {
  assert.deepEqual(slots({ daysOff: [{ start_date: '2026-10-05', end_date: '2026-10-07', reason: 'Отпуск' }] }), []);
  assert.deepEqual(slots({ workingHours: [{ ...schedule, is_working: false }] }), []);
});
test('does not expose past dates or elapsed times today', () => {
  assert.deepEqual(slots({ now: new Date(2026, 9, 6, 12) }), []);
  assert.deepEqual(slots({ now: new Date(2026, 9, 5, 11, 5) }), ['11:30']);
});
test('busy appointments remain blocking regardless of UI search or status filters', () => {
  assert.equal(slots({ appointments: [appointment({ patient_name: 'Hidden by search' })] }).includes('11:00'), false);
});
test('guards invalid duration and interval settings', () => {
  assert.deepEqual(slots({ duration: 0 }), []);
  assert.deepEqual(slots({ duration: NaN }), []);
  assert.deepEqual(slots({ interval: 0 }), slots());
});
