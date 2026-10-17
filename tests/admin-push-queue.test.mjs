import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const admin = '22222222-2222-4222-8222-222222222222';
before(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role' $$;
    grant usage on schema public, auth to anon, authenticated, service_role;`);
  const base = (await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8')).split('-- НАЧАЛНИ ДАННИ (SEED DATA)')[0];
  await db.exec(base);
  await db.exec('grant all on all tables in schema public to anon, authenticated, service_role;');
  await db.exec(await readFile(new URL('../supabase/migrations/20261005210545_automated_appointment_reminders.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20261016154851_admin_web_push.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20261017125023_admin_push_appointment_targets.sql', import.meta.url), 'utf8'));
  await db.query('insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now())', [admin, 'mirkanstefanov2007@gmail.com']);
});
after(async () => db.close());
beforeEach(async () => { await db.exec('reset role; truncate public.admin_push_subscriptions, public.appointments, public.working_hours, public.days_off cascade;'); });
async function subscribe(endpoint = 'https://fcm.googleapis.com/fcm/send/test') {
  return (await db.query(`insert into public.admin_push_subscriptions(user_id,endpoint,p256dh,auth,vapid_public_key) values ($1,$2,'key','auth','public') returning id`, [admin, endpoint])).rows[0].id;
}
async function book() {
  return (await db.query(`insert into public.appointments(patient_name,patient_phone,date,start_time,end_time) values ('Private Patient','0888123456','2026-12-01','10:00','10:30') returning id`)).rows[0].id;
}
const jobs = async () => (await db.query('select * from public.admin_push_jobs order by created_at')).rows;
const claim = async () => (await db.query('select * from public.claim_admin_push_jobs(12)')).rows;

test('a new booking creates one private notice for each already enabled device', async () => {
  await subscribe(); await subscribe('https://web.push.apple.com/test'); const id = await book();
  const queued = await jobs(); assert.equal(queued.length, 2);
  assert.equal(queued[0].payload.title, 'Нов записан час');
  assert.equal(queued[0].payload.appointmentId, id);
  assert.equal(queued[0].payload.date, '2026-12-01');
  assert.doesNotMatch(JSON.stringify(queued), /Private Patient|0888123456/);
});
test('enabling a device does not replay old appointments', async () => {
  await book(); await subscribe(); assert.equal((await jobs()).length, 0);
});
test('reminder markers and unchanged writes do not create update spam', async () => {
  await subscribe(); const id = await book();
  await db.query('update public.appointments set reminder_sent=true where id=$1', [id]);
  await db.query('update public.appointments set patient_name=patient_name where id=$1', [id]);
  assert.equal((await jobs()).length, 1);
});
test('rescheduling, cancellation and deletion all survive as separate events', async () => {
  await subscribe(); const id = await book();
  await db.query("update public.appointments set start_time='11:00',end_time='11:30' where id=$1", [id]);
  await db.query("update public.appointments set status='cancelled' where id=$1", [id]);
  await db.query('delete from public.appointments where id=$1', [id]);
  assert.deepEqual((await jobs()).map(job => job.payload.title), ['Нов записан час','Преместен час','Отменен час','Изтрит час']);
  assert.ok((await jobs()).every(job => job.payload.appointmentId === id));
  assert.equal((await jobs()).at(-1).payload.date, '2026-12-01');
});
test('working hours and days off create notices; unchanged hours do not', async () => {
  await subscribe();
  await db.exec("insert into public.working_hours(day_of_week,day_name,start_time,end_time) values (1,'Понеделник','09:00','18:00'); update public.working_hours set end_time=end_time; insert into public.days_off(start_date,end_date,reason) values ('2026-12-01','2026-12-02','Почивка');");
  assert.deepEqual((await jobs()).map(job => job.payload.title), ['Промяна в работното време','Промяна в почивните дни']);
  assert.ok((await jobs()).every(job => !job.payload.appointmentId));
});
test('a second worker cannot claim a leased job; stale leases use a new token', async () => {
  await subscribe(); await book(); await db.exec('set role service_role');
  const first = await claim(); assert.equal(first.length, 1); assert.equal((await claim()).length, 0);
  await db.exec("update public.admin_push_jobs set claimed_at=now()-interval '3 minutes'");
  const second = await claim(); assert.equal(second[0].id, first[0].id);
  assert.notEqual(second[0].claim_token, first[0].claim_token); assert.equal(second[0].attempts, 2);
});
test('expired and exhausted deliveries stop retrying', async () => {
  await subscribe(); await book();
  await db.exec("update public.admin_push_jobs set attempts=5, status='sending', claimed_at=now()-interval '3 minutes'");
  assert.equal((await claim()).length, 0); assert.equal((await jobs())[0].status, 'failed');
  await db.exec("update public.admin_push_jobs set attempts=0,status='pending',created_at=now()-interval '25 hours'");
  assert.equal((await claim()).length, 0); assert.equal((await jobs())[0].status, 'failed');
});
test('anonymous bookings enqueue successfully but cannot access subscriptions or jobs', async () => {
  await subscribe(); await db.exec("set role anon; insert into public.appointments(patient_name,patient_phone,date,start_time,end_time) values ('Public booking','0888123456','2026-12-01','10:00','10:30');");
  await assert.rejects(jobs(), /permission denied/); await assert.rejects(claim(), /permission denied/);
  await assert.rejects(db.query('select * from public.admin_push_subscriptions'), /permission denied/);
  await db.exec('reset role'); assert.equal((await jobs()).length, 1);
});
test('even authenticated admins use the server API for device capabilities', async () => {
  await db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${admin}","role":"authenticated"}';`);
  await assert.rejects(db.query('select * from public.admin_push_subscriptions'), /permission denied/);
  await assert.rejects(claim(), /permission denied/);
});
test('disabling a device removes every pending delivery', async () => {
  const id = await subscribe(); await book();
  await db.query('delete from public.admin_push_subscriptions where id=$1', [id]);
  assert.equal((await claim()).length, 0);
});
