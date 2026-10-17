import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import webpush from 'web-push';
import { parsePushSubscription, validPushEndpoint, deliverPush } from '../netlify/functions/_shared/push.ts';

const keys = webpush.generateVAPIDKeys();
const config = { ...keys, subject: 'https://example.com' };
const device = { endpoint: 'https://fcm.googleapis.com/fcm/send/test', p256dh: keys.publicKey, auth: Buffer.alloc(16).toString('base64url'), vapid_public_key: keys.publicKey };

test('subscription parsing validates both device keys and known HTTPS push services', () => {
  assert.ok(parsePushSubscription({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }));
  for (const endpoint of ['http://fcm.googleapis.com/x','https://fcm.googleapis.com.evil.test/x','https://localhost/x','https://127.0.0.1/x','https://fcm.googleapis.com:444/x','https://user@fcm.googleapis.com/x','https://evil.test@fcm.googleapis.com/x']) assert.equal(validPushEndpoint(endpoint), false);
  assert.equal(parsePushSubscription({ endpoint: device.endpoint, keys: { p256dh: 'bad', auth: 'bad' } }), null);
});
test('valid push is encrypted and sent with fixed VAPID identity and bounded timeout', async () => {
  const send = mock.method(webpush, 'sendNotification', async (_sub, payload, options) => {
    assert.equal(JSON.parse(payload).title, 'Нов час'); assert.equal(options.timeout, 4000);
    assert.equal(options.vapidDetails.publicKey, keys.publicKey);
  });
  try { assert.equal(await deliverPush(device, { title: 'Нов час', body: 'Вижте графика', tag: 'job-1' }, config), 'accepted'); assert.equal(send.mock.calls.length, 1); }
  finally { send.mock.restore(); }
});
test('gone devices expire; transient failures retry; rotated VAPID keys never send', async () => {
  const send = mock.method(webpush, 'sendNotification', async () => { throw { statusCode: 410 }; });
  try {
    assert.equal(await deliverPush(device, {}, config), 'expired');
    send.mock.mockImplementation(async () => { throw { statusCode: 503 }; });
    assert.equal(await deliverPush(device, {}, config), 'retry');
    assert.equal(await deliverPush({ ...device, vapid_public_key: 'old' }, {}, config), 'expired');
    assert.equal(send.mock.calls.length, 2);
  } finally { send.mock.restore(); }
});
