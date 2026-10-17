import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
function worker(windows = []) {
  const handlers = {}, shown = [], opened = [];
  const self = { addEventListener: (name, fn) => { handlers[name] = fn; }, location: { origin: 'https://clinic.example' }, registration: { showNotification: async (title, options) => { shown.push({ title, options }); } }, clients: { matchAll: async () => windows, openWindow: async url => { opened.push(url); } } };
  vm.runInNewContext(source, { self, URL });
  return { handlers, shown, opened };
}
test('push displays a notification even for missing, malformed or null payloads', async () => {
  for (const data of [null, { json: () => null }, { json: () => { throw new Error('bad json'); } }]) {
    const w = worker(); let pending;
    w.handlers.push({ data, waitUntil: promise => { pending = promise; } }); await pending;
    assert.equal(w.shown.length, 1); assert.equal(w.shown[0].title, 'Кабинетът Ви');
  }
});
test('notification clicks always open the authenticated admin schedule on this origin', async () => {
  const w = worker(); let pending;
  w.handlers.notificationclick({ notification: { close() {}, data: { url: 'https://attacker.example' } }, waitUntil: promise => { pending = promise; } }); await pending;
  assert.deepEqual(w.opened, ['https://clinic.example/admin/#schedule']);
});
test('an open admin window is reused and focused', async () => {
  const calls = [];
  const w = worker([{ url: 'https://clinic.example/admin/#settings', navigate: async url => { calls.push(url); }, focus: async () => { calls.push('focused'); } }]); let pending;
  w.handlers.notificationclick({ notification: { close() {} }, waitUntil: promise => { pending = promise; } }); await pending;
  assert.deepEqual(calls, ['https://clinic.example/admin/#schedule','focused']); assert.equal(w.opened.length, 0);
});

test('push keeps the booking reference and clicking opens that appointment day', async () => {
  const w = worker(); let pending;
  const id = '22222222-2222-4222-8222-222222222222';
  w.handlers.push({ data: { json: () => ({ title: 'Нов час', appointmentId: id, date: '2026-12-01', url: 'https://attacker.example' }) }, waitUntil: promise => { pending = promise; } });
  await pending;
  const data = w.shown[0].options.data;
  assert.equal(data.appointmentId, id);
  w.handlers.notificationclick({ notification: { close() {}, data }, waitUntil: promise => { pending = promise; } }); await pending;
  assert.deepEqual(w.opened, [`https://clinic.example/admin/?appointment=${id}&date=2026-12-01#schedule`]);
});
test('invalid booking references fall back to the schedule', async () => {
  const w = worker(); let pending;
  w.handlers.notificationclick({ notification: { close() {}, data: { appointmentId: '../vhod', date: '2026-12-01' } }, waitUntil: promise => { pending = promise; } }); await pending;
  assert.deepEqual(w.opened, ['https://clinic.example/admin/#schedule']);
});
