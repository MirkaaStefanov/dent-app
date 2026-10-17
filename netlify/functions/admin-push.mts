import type { Config, Context } from '@netlify/functions';
import { getAuthorizedAdmin, serverDatabase } from './_shared/config';
import { pushConfig, parsePushSubscription, validPushEndpoint, deliverPush } from './_shared/push';

const headers = { 'Cache-Control': 'no-store' };
const reply = (data: object, status = 200) => Response.json(data, { status, headers });

export default async function adminPush(request: Request, context: Context) {
  try {
    const admin = await getAuthorizedAdmin(request);
    if (!admin) return reply({ error: 'Влезте с лекарски профил.' }, 403);
    const db = serverDatabase(), vapid = pushConfig();
    if (!db) return reply({ error: 'Системата за известия още не е настроена.' }, 503);
    const { error: schemaError } = await db.from('admin_push_subscriptions').select('id', { head: true }).limit(1);
    const ready = Boolean(vapid && !schemaError && context.deploy.published);
    if (request.method === 'GET') return reply({ ready, publicKey: vapid?.publicKey || null, published: context.deploy.published });
    if (!ready || !vapid) return reply({ error: 'Известията ще са достъпни след активиране на публикувания сайт.' }, 503);
    if (Number(request.headers.get('content-length') || 0) > 8192) return reply({ error: 'Невалидна заявка.' }, 413);
    const text = await request.text();
    if (text.length > 8192) return reply({ error: 'Невалидна заявка.' }, 413);
    let body;
    try { body = JSON.parse(text); } catch { return reply({ error: 'Невалидна заявка.' }, 400); }
    if (!body || typeof body !== 'object') return reply({ error: 'Невалидна заявка.' }, 400);
    if (body.action === 'subscribe') {
      const subscription = parsePushSubscription(body.subscription);
      if (!subscription) return reply({ error: 'Телефонът не предостави валиден абонамент.' }, 400);
      // The endpoint is a device capability. A different account on the same device
      // must explicitly enable it before it is reassigned to that account.
      const { error } = await db.from('admin_push_subscriptions').upsert({ ...subscription, user_id: admin.id, vapid_public_key: vapid.publicKey, updated_at: new Date().toISOString() }, { onConflict: 'endpoint' });
      if (error) return reply({ error: 'Известията не бяха включени. Опитайте отново.' }, 503);
      return reply({ active: true });
    }
    if (!validPushEndpoint(body.endpoint)) return reply({ error: 'Невалиден абонамент.' }, 400);
    if (body.action === 'disable') {
      const { error } = await db.from('admin_push_subscriptions').delete().eq('user_id', admin.id).eq('endpoint', body.endpoint);
      return error ? reply({ error: 'Известията не бяха изключени. Опитайте отново.' }, 503) : reply({ active: false });
    }
    const { data: sub, error } = await db.from('admin_push_subscriptions').select('*').eq('user_id', admin.id).eq('endpoint', body.endpoint).maybeSingle();
    if (error) return reply({ error: 'Абонаментът не може да се провери.' }, 503);
    const active = Boolean(sub && sub.vapid_public_key === vapid.publicKey);
    if (body.action === 'status') return reply({ active });
    if (body.action !== 'test') return reply({ error: 'Невалидно действие.' }, 400);
    if (!active) return reply({ error: 'Първо включете известията на този телефон.' }, 409);
    const result = await deliverPush(sub, { title: 'Известията за кабинета са включени', body: 'Това е тестово известие. Тук ще получавате новите часове и промените в графика.', tag: 'dent-push-test' }, vapid);
    if (result === 'expired') await db.from('admin_push_subscriptions').delete().eq('id', sub.id);
    return result === 'accepted' ? reply({ accepted: true }) : reply({ error: result === 'expired' ? 'Абонаментът е изтекъл. Включете известията отново.' : 'Тестът не беше изпратен. Опитайте отново.' }, 503);
  } catch { return reply({ error: 'Връзката с известията временно не е достъпна.' }, 503); }
}

export const config: Config = { path: '/api/admin-push', method: ['GET', 'POST'], rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowSize: 60, windowLimit: 30 } };
