import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('category migration preserves services, supports optional prices and restricts category writes', async () => {
 const db = new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create function public.is_clinic_admin() returns boolean language sql stable as $$ select coalesce(current_setting('test.admin', true), '') = 'true' $$;
  create table services(id uuid primary key default gen_random_uuid(), category text, price_bgn numeric not null);
  create table clinic_settings(id integer primary key);
  insert into services(category,price_bgn) values ('Профилактика', 20), ('Профилактика', 30), ('Лечение', 40);
  insert into clinic_settings values (1);`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261012093809_service_categories_and_optional_prices.sql', import.meta.url), 'utf8'));
  assert.equal((await db.query('select count(*)::integer as n from service_categories')).rows[0].n, 2);
  assert.equal((await db.query('select count(*)::integer as n from services where category_id is not null')).rows[0].n, 3);
  assert.equal((await db.query('select show_prices from clinic_settings')).rows[0].show_prices, false);
  await db.exec('update services set price_bgn=null;');
  await assert.rejects(db.exec('update services set price_bgn=-1;'));
  await db.exec('set role anon;');
  assert.equal((await db.query('select * from service_categories')).rows.length, 2);
  await assert.rejects(db.exec("insert into service_categories(name) values ('Неоторизиран');"));
  await db.exec('reset role; set role authenticated;');
  await assert.rejects(db.exec("insert into service_categories(name) values ('Пациент');"));
  await db.exec("set test.admin='true'; insert into service_categories(name) values ('Детска грижа');");
  assert.equal((await db.query('select * from service_categories')).rows.length, 3);
  await db.exec("delete from service_categories where name='Детска грижа';");
  assert.equal((await db.query('select * from service_categories')).rows.length, 2);
  await assert.rejects(db.exec("delete from service_categories where name='Профилактика';"), {code: '23503'});
  await db.exec('reset role;');
  assert.equal((await db.query('select count(*)::integer as n from services')).rows[0].n, 3);
 } finally {await db.close();}
});
