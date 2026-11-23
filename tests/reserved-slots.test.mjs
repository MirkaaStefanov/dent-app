import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReservedSlot, isReservedSlot, addMinutesToTime } from '../src/lib/reserved-slots.ts';
import { calculateAvailableSlots } from '../src/lib/availability.ts';

const service = { id: '00000000-0000-4000-8000-000000000001', title: 'Преглед', duration_minutes: 30, price_bgn: null };

test('a one-click reservation is an admin hold with no patient contact or reminders', () => {
  const hold = buildReservedSlot({ service, date: '2026-12-01', time: '10:45' });
  assert.equal(hold.end_time, '11:15');
  assert.equal(hold.booked_by, 'admin');
  assert.equal(hold.notification_consent, false);
  assert.equal(hold.status, 'confirmed');
  assert.ok(isReservedSlot(hold));
  assert.ok(!isReservedSlot({ ...hold, booked_by: 'patient' }));
  assert.ok(!isReservedSlot({ booked_by: 'admin', notes: '[Записан от лекарката по телефона]' }));
});

test('addMinutesToTime crosses the hour', () => {
  assert.equal(addMinutesToTime('09:50', 25), '10:15');
});

test('a reserved slot is no longer offered for public booking', () => {
  const workingHours = [{ id: 'tue', day_of_week: 2, day_name: 'Вторник', is_working: true, start_time: '09:00', end_time: '12:00' }];
  const base = { date: '2026-12-01', duration: 30, workingHours, daysOff: [], interval: 15, now: new Date(2026, 10, 23) };
  const before = calculateAvailableSlots({ ...base, appointments: [] });
  assert.ok(before.slots.includes('10:00'));
  const hold = buildReservedSlot({ service, date: '2026-12-01', time: '10:00' });
  const after = calculateAvailableSlots({ ...base, appointments: [hold] });
  assert.ok(!after.slots.includes('10:00'));
  assert.ok(!after.slots.includes('09:45'));
  assert.ok(after.slots.includes('10:30'));
});
