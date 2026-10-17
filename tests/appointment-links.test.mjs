import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAppointmentTarget, appointmentTargetUrl, safeAppointmentReturnUrl } from '../src/lib/appointment-links.ts';
const id = '22222222-2222-4222-8222-222222222222';

test('appointment notification links survive a login round trip', () => {
  const target = { id, date: '2026-12-01' };
  const url = appointmentTargetUrl(target);
  assert.equal(url, `/admin/?appointment=${id}&date=2026-12-01#schedule`);
  assert.deepEqual(parseAppointmentTarget(new URL(url, 'https://clinic.example').search), target);
  assert.equal(safeAppointmentReturnUrl(url), url);
});
test('login return targets reject external destinations and invalid booking references', () => {
  for (const url of ['https://attacker.example/admin/?appointment='+id, '//attacker.example/admin/?appointment='+id, '/admin/elsewhere?appointment='+id, 'javascript:alert(1)', '/admin/?appointment=bad', null]) assert.equal(safeAppointmentReturnUrl(url), null);
});
test('invalid calendar dates are ignored while valid booking references still open', () => {
  for (const date of ['2026-02-30', '2026-13-01', 'bad']) assert.deepEqual(parseAppointmentTarget(`?appointment=${id}&date=${date}`), { id });
  assert.deepEqual(parseAppointmentTarget(`?appointment=${id}&date=2028-02-29`), {id,date:'2028-02-29'});
});
