import type { Config, Context } from '@netlify/functions';
import { serverDatabase } from './_shared/config';
import { pushConfig, deliverPush, type PushMessage, type StoredSubscription } from './_shared/push';

type Job = { id: string; subscription_id: string; payload: PushMessage; attempts: number; claim_token: string };

export default async function dispatchPush(_request: Request, context: Context) {
  const db = serverDatabase(), vapid = pushConfig();
  if (!context.deploy.published || !db || !vapid) return;
  const { data, error } = await db.rpc('claim_admin_push_jobs', { p_limit: 12 });
  if (error) { console.error('Admin push queue unavailable'); return; }
  await Promise.all(((data || []) as Job[]).map(async job => {
    try {
      const { data: sub, error: lookupError } = await db.from('admin_push_subscriptions').select('*').eq('id', job.subscription_id).maybeSingle();
      if (lookupError) throw new Error('subscription_lookup_failed');
      if (!sub) return; // Unsubscribing deletes its pending deliveries too.
      // Claims already filter roles; recheck immediately before sending as well.
      const { data: user, error: userError } = await db.auth.admin.getUserById(sub.user_id);
      if (userError || !user.user) throw new Error('recipient_lookup_failed');
      const { data: profile, error: profileError } = await db.from('profiles').select('role').eq('id', sub.user_id).maybeSingle();
      if (profileError) throw new Error('role_lookup_failed');
      if (user.user.app_metadata?.role !== 'admin' && profile?.role !== 'admin') {
        await db.from('admin_push_subscriptions').delete().eq('id', sub.id);
        return;
      }
      const result = await deliverPush(sub as StoredSubscription, { ...job.payload, tag: `dent-${job.id}` }, vapid);
      if (result === 'expired') {
        await db.from('admin_push_subscriptions').delete().eq('id', sub.id);
        return;
      }
      const { error: receiptError } = await db.from('admin_push_jobs').update({
        status: result === 'accepted' ? 'sent' : job.attempts >= 5 ? 'failed' : 'pending',
        next_attempt_at: new Date(Date.now() + Math.min(30, 2 ** job.attempts) * 60000).toISOString(),
        sent_at: result === 'accepted' ? new Date().toISOString() : null,
      }).eq('id', job.id).eq('claim_token', job.claim_token);
      if (receiptError) throw new Error('receipt_save_failed');
    } catch { console.error('Admin push job deferred; lease will expire'); }
  }));
}

export const config: Config = { schedule: '* * * * *' };
