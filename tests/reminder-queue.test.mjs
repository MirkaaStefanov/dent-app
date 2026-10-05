import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
before(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role' $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
  `);
  const base = (await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8')).split('-- НАЧАЛНИ ДАННИ (SEED DATA)')[0];
  await db.exec(base);
  await db.exec(`grant all on all tables in schema public to anon, authenticated, service_role;`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261005210545_automated_appointment_reminders.sql', import.meta.url), 'utf8'));
  await db.exec(`insert into public.clinic_settings(doctor_name) values ('Тест');`);
});
after(async () => { await db.close(); });

async function reset() {
  await db.exec('reset role; truncate public.appointments cascade;');
}
async function insert({ status = 'confirmed', consent = true, email = 'test@example.com', shift = '12 hours', sent = false } = {}) {
  return (await db.query(`insert into public.appointments(patient_name, patient_phone, patient_email, date, start_time, end_time, status, notification_consent, reminder_sent)
    select 'Тест', '0888123456', $1, (t at time zone 'Europe/Sofia')::date, (t at time zone 'Europe/Sofia')::time, ((t + interval '30 minutes') at time zone 'Europe/Sofia')::time, $2, $3, $4
    from (select now() + $5::interval as t) s returning id`, [email, status, consent, sent, shift])).rows[0].id;
}
const claim = async () => (await db.query("select * from public.claim_appointment_reminders(array['email','sms'], 10)")).rows;

test('migration creates both channels once; a second worker does not claim sending jobs', async () => {
  await reset(); await insert(); await db.exec('set role service_role;');
  const first = await claim(), second = await claim();
  assert.equal(first.length, 2); assert.equal(second.length, 0);
  assert.deepEqual(first.map(row => row.channel).sort(), ['email', 'sms']);
  await db.exec('reset role;');
});
test('cancelled, past, unconsented and manually reminded bookings are excluded', async () => {
  await reset(); await insert({ status: 'cancelled' }); await insert({ consent: false }); await insert({ shift: '-1 hour' }); await insert({ sent: true }); await insert({ shift: '48 hours' });
  assert.equal((await claim()).length, 0);
});
test('appointments without an email can still receive SMS', async () => {
  await reset(); await insert({ email: null });
  const jobs = await claim(); assert.equal(jobs.length, 1); assert.equal(jobs[0].channel, 'sms');
});
test('stale SMS submissions are quarantined while email can retry with the same job id', async () => {
  await reset(); await insert(); const jobs = await claim();
  await db.exec("update public.appointment_notifications set claimed_at = now() - interval '20 minutes'");
  const retried = await claim(); assert.equal(retried.length, 1); assert.equal(retried[0].channel, 'email');
  assert.equal(retried[0].id, jobs.find(job => job.channel === 'email').id);
  const sms = (await db.query("select status from public.appointment_notifications where channel='sms'")).rows[0];
  assert.equal(sms.status, 'unknown');
});
test('cancellation after queueing prevents subsequent sends', async () => {
  await reset(); const id = await insert(); await claim();
  await db.query("update public.appointments set status='cancelled' where id=$1", [id]);
  assert.equal((await claim()).length, 0);
  assert.equal((await db.query("select count(*)::int as count from public.appointment_notifications where status='skipped'")).rows[0].count, 2);
});
test('database timezone conversion handles Sofia summer and winter time', async () => {
  const rows = (await db.query("select extract(hour from (date '2026-07-10' + time '09:30') at time zone 'Europe/Sofia' at time zone 'UTC')::int as summer, extract(hour from (date '2026-12-10' + time '09:30') at time zone 'Europe/Sofia' at time zone 'UTC')::int as winter")).rows[0];
  assert.deepEqual(rows, { summer: 6, winter: 7 });
});
test('patients cannot read bookings, self-promote or claim reminder jobs; authorized admin can read', async () => {
  await reset(); await insert();
  const patient = '11111111-1111-4111-8111-111111111111', admin = '22222222-2222-4222-8222-222222222222';
  await db.exec(`insert into auth.users(id,email,email_confirmed_at) values ('${patient}', 'patient@example.com', now()), ('${admin}', 'mirkanstefanov2007@gmail.com', now());`);
  await db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${patient}","role":"authenticated"}';`);
  assert.equal((await db.query('select * from public.appointments')).rows.length, 0);
  await assert.rejects(db.query("update public.profiles set role='admin'"), /permission denied/);
  await assert.rejects(claim(), /permission denied/);
  await db.exec(`set request.jwt.claims = '{"sub":"${admin}","role":"authenticated"}';`);
  assert.equal((await db.query('select * from public.appointments')).rows.length, 1);
  await db.exec('reset role;');
});

test('public booking can read occupied times but cannot obtain patient identities', async () => {
  await reset(); const id = await insert();
  const date = (await db.query('select date::text from public.appointments where id=$1', [id])).rows[0].date;
  await db.exec('set role anon;');
  const rows = (await db.query('select * from public.get_booked_slots_for_date($1::date)', [date])).rows;
  assert.equal(rows.length, 1);
  assert.deepEqual(Object.keys(rows[0]).sort(), ['end_time', 'start_time']);
  assert.equal((await db.query('select * from public.appointments')).rows.length, 0);
  await db.exec('reset role;');
});
