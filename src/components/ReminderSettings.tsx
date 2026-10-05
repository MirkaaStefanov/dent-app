'use client';
import { useEffect, useState } from 'react';
import { Bell, Mail, MessageSquare, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import styles from './ReminderSettings.module.css';

type Status = { active: boolean; channels: ('email' | 'sms')[]; queueReady: boolean; counts: { accepted: number; failed: number; unknown: number } };
async function readStatus(): Promise<Status | null> {
  const { data } = await (supabase ? supabase.auth.getSession() : Promise.resolve({ data: { session: null } }));
  if (!data.session) return null;
  const response = await fetch('/api/reminder-status', { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: 'no-store', signal: AbortSignal.timeout(8000) });
  return response.ok ? await response.json() : null;
}

export default function ReminderSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { setStatus(await readStatus()); }
    catch { setStatus(null); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    let active = true;
    void readStatus().then(result => { if (active) setStatus(result); }).catch(() => { if (active) setStatus(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <section className={styles.panel} aria-labelledby="reminder-title"><div className={styles.heading}><Bell size={19} /><h3 id="reminder-title">Автоматични напомняния</h3><button type="button" onClick={load} disabled={loading} aria-label="Провери състоянието на напомнянията"><RefreshCw size={16} /></button></div><p role="status" className={styles.status}>{loading ? 'Проверяваме състоянието…' : status?.active ? 'Активни · проверка на всеки 5 минути' : 'Неактивни · автоматично изпращане не е потвърдено'}</p><div className={styles.channels}><span><Mail size={16} />Имейл <small>{status?.channels.includes('email') ? 'Свързан' : 'Не е свързан'}</small></span><span><MessageSquare size={16} />SMS <small>{status?.channels.includes('sms') ? 'Свързан' : 'Не е свързан'}</small></span></div><p>Изпращаме напомняне за потвърдените часове, когато пациентът е избрал да го получава. Отменените часове се пропускат.</p>{status && <div className={styles.results}><span><strong>{status.counts.accepted}</strong>приети от доставчика</span><span><strong>{status.counts.failed + status.counts.unknown}</strong>нуждаят се от проверка</span><small>Последните 7 дни · приемането от доставчика не удостоверява доставката до пациента.</small></div>}{!loading && !status?.active && <p className={styles.note}>Докато автоматичните напомняния не са активни, използвайте ръчните SMS/Viber бутони в графика.</p>}</section>;
}
