import { open, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import webpush from 'web-push';

// Stable VAPID keys identify this application to the push services. Never rotate
// them on build/deploy: existing devices would need to subscribe again.
const destination = resolve('.env.admin-push.local');
try {
  const existing = await readFile(destination, 'utf8');
  if (!existing.includes('VAPID_PRIVATE_KEY=') || !existing.includes('VAPID_PUBLIC_KEY=')) throw new Error('Existing push environment is incomplete; inspect it locally before proceeding.');
  console.log(`Reusing existing push configuration: ${destination}`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const keys = webpush.generateVAPIDKeys();
  const file = await open(destination, 'wx', 0o600);
  try { await file.writeFile(`VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nVAPID_SUBJECT=https://dr-djanel-ayaz.netlify.app\n`); }
  finally { await file.close(); }
  console.log(`Created private push configuration: ${destination}`);
}
console.log('No keys were printed. Import this file into the linked Netlify project; keep VAPID_PRIVATE_KEY server-only.');
