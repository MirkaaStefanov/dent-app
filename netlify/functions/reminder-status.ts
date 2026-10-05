import type { Config, Context } from '@netlify/functions';
import { authorizeAdmin, senderConfig, serverDatabase } from './_shared/config';

const reminderStatus = async (request: Request, context: Context) => {
  const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };
  try {
    if (!await authorizeAdmin(request)) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 403, headers });
    const sender = senderConfig(), db = serverDatabase();
    let queueReady = false;
    const counts = { accepted: 0, failed: 0, unknown: 0 };
    if (db) {
      const results = await Promise.all(Object.keys(counts).map(status => db.from('appointment_notifications').select('id', { count: 'exact', head: true }).eq('status', status).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())));
      queueReady = results.every(result => !result.error);
      results.forEach((result, index) => { counts[Object.keys(counts)[index] as keyof typeof counts] = result.count || 0; });
    }
    return new Response(JSON.stringify({ active: sender.enabled && sender.channels.length > 0 && queueReady && context.deploy.published, channels: sender.channels, queueReady, counts }), { headers });
  } catch { return new Response(JSON.stringify({ error: 'unavailable' }), { status: 503, headers }); }
};
export default reminderStatus;
export const config: Config = { path: '/api/reminder-status', method: 'GET' };
