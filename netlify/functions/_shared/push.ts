import webpush from 'web-push';

export type StoredSubscription = { endpoint: string; p256dh: string; auth: string; vapid_public_key: string };
export type PushMessage = { title: string; body: string; tag: string; appointmentId?: string; date?: string };
export type PushConfig = { publicKey: string; privateKey: string; subject: string };

export function pushConfig(): PushConfig | null {
  const publicKey = Netlify.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Netlify.env.get('VAPID_PRIVATE_KEY');
  const subject = Netlify.env.get('VAPID_SUBJECT');
  return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
}

// A browser subscription must never turn this service into an arbitrary HTTP proxy.
export function validPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) return false;
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash && (
      url.hostname === 'fcm.googleapis.com' ||
      url.hostname === 'updates.push.services.mozilla.com' ||
      url.hostname === 'web.push.apple.com' || url.hostname.endsWith('.push.apple.com') ||
      url.hostname === 'wns.windows.com' || url.hostname.endsWith('.wns.windows.com')
    );
  } catch { return false; }
}

export function parsePushSubscription(value: unknown): { endpoint: string; p256dh: string; auth: string } | null {
  if (!value || typeof value !== 'object') return null;
  const sub = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (!validPushEndpoint(sub.endpoint) || !sub.keys) return null;
  const { p256dh, auth } = sub.keys;
  if (typeof p256dh !== 'string' || typeof auth !== 'string' || !/^[\w-]+={0,2}$/.test(p256dh) || !/^[\w-]+={0,2}$/.test(auth)) return null;
  const key = Buffer.from(p256dh, 'base64url');
  if (key.length !== 65 || key[0] !== 4 || Buffer.from(auth, 'base64url').length !== 16) return null;
  return { endpoint: sub.endpoint, p256dh, auth };
}

export async function deliverPush(subscription: StoredSubscription, message: PushMessage, config: PushConfig) {
  if (!validPushEndpoint(subscription.endpoint) || subscription.vapid_public_key !== config.publicKey) return 'expired' as const;
  try {
    await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(message), {
      vapidDetails: { subject: config.subject, publicKey: config.publicKey, privateKey: config.privateKey },
      TTL: 3600, urgency: 'high', timeout: 4000,
    });
    return 'accepted' as const;
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return 'expired' as const;
    return 'retry' as const;
  }
}
