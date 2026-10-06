import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const patientId = '11111111-1111-4111-8111-111111111111';
const strangerId = '22222222-2222-4222-8222-222222222222';

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
  await db.exec('grant all on all tables in schema public to anon, authenticated, service_role;');
  await db.exec(await readFile(new URL('../supabase/migrations/20261005210545_automated_appointment_reminders.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20261006110612_patient_accounts_and_booking_history.sql', import.meta.url), 'utf8'));
});

after(async () => { await db.close(); });

async function book(email) {
  return (await db.query(`insert into public.appointments(patient_name, patient_phone, patient_email, date, start_time, end_time)
    values ('Пациент', '0888123456', $1, current_date + 7, '10:00', '10:30') returning id`, [email])).rows[0].id;
}

test('guest booking stays unlinked until the matching email is verified', async () => {
  const id = await book('patient@example.com');
  await db.query('insert into auth.users(id,email) values ($1,$2)', [patientId, 'patient@example.com']);
  assert.equal((await db.query('select patient_user_id from public.appointments where id=$1', [id])).rows[0].patient_user_id, null);

  await db.query('update auth.users set email_confirmed_at=now() where id=$1', [patientId]);
  assert.equal((await db.query('select patient_user_id from public.appointments where id=$1', [id])).rows[0].patient_user_id, patientId);
});

test('a verified patient sees only appointments linked to their own account', async () => {
  await db.query('insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now())', [strangerId, 'stranger@example.com']);
  await book('stranger@example.com');

  await db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${patientId}","role":"authenticated"}';`);
  const visible = (await db.query('select patient_email from public.appointments order by patient_email')).rows;
  assert.deepEqual(visible.map((row) => row.patient_email), ['patient@example.com']);
  await db.exec('reset role;');
});

test('clients cannot claim ownership by supplying a user id', async () => {
  await db.exec('set role anon;');
  await assert.rejects(
    db.query(`insert into public.appointments(patient_user_id, patient_name, patient_phone, patient_email, date, start_time, end_time)
      values ($1, 'Измама', '0888000000', 'other@example.com', current_date + 8, '11:00', '11:30')`, [patientId]),
    /row-level security/
  );
  await db.exec('reset role;');
});

test('anonymous visitors cannot read or change appointment details', async () => {
  await db.exec('set role anon;');
  assert.equal((await db.query('select * from public.appointments')).rows.length, 0);
  await db.query("update public.appointments set patient_name='Променено'");
  await db.exec('reset role;');
  assert.equal((await db.query("select count(*)::int as count from public.appointments where patient_name='Променено'")).rows[0].count, 0);
});

test('new bookings are automatically linked when the email is already verified', async () => {
  const id = await book('PATIENT@example.com');
  assert.equal((await db.query('select patient_user_id from public.appointments where id=$1', [id])).rows[0].patient_user_id, patientId);
});
