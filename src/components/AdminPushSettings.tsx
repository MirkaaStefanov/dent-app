'use client';

import { useEffect, useState } from 'react';
import { Bell, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import styles from './AdminPushSettings.module.css';

type Status = { ready: boolean; publicKey: string | null; published: boolean };
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

async function pushRequest(body?: object) {
  const { data } = await (supabase ? supabase.auth.getSession() : Promise.resolve({ data: { session: null } }));
  if (!data.session) throw new Error('Влезте с лекарския си профил, за да включите известията.');
  const response = await fetch('/api/admin-push', {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store', signal: AbortSignal.timeout(12000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new Error(result?.error || 'Системата за известия временно не е достъпна. Опитайте отново.');
  return result;
}

function applicationKey(value: string) {
  const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

export default function AdminPushSettings() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [status, setStatus] = useState<Status | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    let mounted = true;
    const supportedHere = window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const iosHere = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const installedHere = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const captureInstall = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent); };
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); };
    window.addEventListener('beforeinstallprompt', captureInstall);
    window.addEventListener('appinstalled', onInstalled);
    async function load() {
      if (!mounted) return;
      setSupported(supportedHere); setIsIOS(iosHere); setInstalled(installedHere);
      if (!supportedHere) { setBusy(false); return; }
      setPermission(Notification.permission);
      try {
        const [config, registration] = await Promise.all([
          pushRequest() as Promise<Status>,
          navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }),
        ]);
        const sub = await registration.pushManager.getSubscription();
        const saved = sub && config.ready ? await pushRequest({ action: 'status', endpoint: sub.endpoint }) : null;
        if (mounted) { setStatus(config); setSubscription(sub); setActive(saved?.active === true && Notification.permission === 'granted'); }
      } catch (err) { if (mounted) setError(err instanceof Error ? err.message : 'Не успяхме да проверим известията.'); }
      finally { if (mounted) setBusy(false); }
    }
    void Promise.resolve().then(load);
    return () => {
      mounted = false;
      window.removeEventListener('beforeinstallprompt', captureInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function perform(action: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('');
    try { await action(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Операцията не успя. Опитайте отново.'); }
    finally { setBusy(false); }
  }

  const enable = () => {
    // Request permission directly from the user's click (required by iOS).
    const allowed = Notification.requestPermission();
    void perform(async () => {
      const result = await allowed;
      setPermission(result);
      if (result !== 'granted') throw new Error('Разрешете известията от настройките на браузъра за този сайт.');
      const config = await pushRequest() as Status;
      setStatus(config);
      if (!config.ready || !config.publicKey) throw new Error('Изпращането още не е активирано на сайта.');
      await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
      const registration = await navigator.serviceWorker.ready;
      let sub = await registration.pushManager.getSubscription();
      if (sub) {
        const key = sub.options.applicationServerKey;
        const expected = applicationKey(config.publicKey);
        if (!key || Array.from(new Uint8Array(key)).join() !== Array.from(expected).join()) { await sub.unsubscribe(); sub = null; }
      }
      sub ||= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationKey(config.publicKey) });
      setSubscription(sub);
      await pushRequest({ action: 'subscribe', subscription: sub.toJSON() });
      setActive(true);
      setMessage('Известията са включени за този телефон. Изпратете тест, за да проверите получаването.');
    });
  };

  return <section className={styles.panel} aria-labelledby="admin-push-title">
    <div className={styles.heading}><Bell size={19} aria-hidden="true" /><h2 id="admin-push-title">Кабинетът на телефона Ви</h2></div>
    <p>Получавайте известия при нов, променен, отменен или изтрит час и при промени в работното време и почивните дни, дори когато сайтът е затворен.</p>
    <p className={styles.status} role="status">{busy ? 'Проверяваме известията…' : active ? 'Известията са включени на това устройство' : permission === 'denied' ? 'Известията са блокирани в браузъра' : supported === false ? 'Този браузър не поддържа push известия' : status && !status.ready ? 'Изпращането на известия още не е активирано на сайта' : 'Известията са изключени на това устройство'}</p>
    {isIOS && !installed && <p>На iPhone/iPad първо отворете сайта в Safari → „Споделяне“ → „Добави към началния екран“. Отворете добавеното приложение и включете известията. Необходим е iOS 16.4 или по-нов.</p>}
    {permission === 'denied' && <p>Отворете настройките на браузъра → разрешения за този сайт → известия → „Разреши“, след което презаредете страницата.</p>}
    <div className={styles.actions}>
      {!active && supported && !(isIOS && !installed) && <button type="button" disabled={busy || permission === 'denied' || !status?.ready} onClick={enable}>Включи известията</button>}
      {active && <button type="button" disabled={busy} onClick={() => void perform(async () => {
        await pushRequest({ action: 'test', endpoint: subscription?.endpoint });
        setMessage('Тестът е приет за изпращане. Проверете известията на телефона.');
      })}>Изпрати тестово известие</button>}
      {subscription && <button type="button" className={styles.secondary} disabled={busy} onClick={() => void perform(async () => {
        await pushRequest({ action: 'disable', endpoint: subscription.endpoint });
        await subscription.unsubscribe(); setSubscription(null); setActive(false);
        setMessage('Известията са изключени на това устройство.');
      })}>Изключи на това устройство</button>}
      {!installed && installEvent && <button type="button" className={styles.secondary} onClick={() => void perform(async () => {
        await installEvent.prompt(); await installEvent.userChoice; setInstallEvent(null);
      })}><Download size={15} aria-hidden="true" /> Добави на началния екран</button>}
      {!busy && error && <button type="button" className={styles.secondary} onClick={() => window.location.reload()}>Провери отново</button>}
    </div>
    {!installed && <details><summary>Как да добавя кабинета като приложение?</summary><ol><li>На Android: отворете сайта в Chrome → меню ⋮ → „Добавяне към началния екран“ или „Инсталиране“.</li><li>На iPhone: Safari → „Споделяне“ → „Добави към началния екран“.</li><li>Отворете приложението, влезте с лекарския профил и натиснете „Включи известията“.</li></ol></details>}
    {active && <p>Обичайно известията се изпращат до около минута. Необходима е интернет връзка и разрешени известия в телефона. Имената и данните на пациентите се виждат след вход в графика.</p>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </section>;
}
