'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, Check, ArrowRight, LockKeyhole } from 'lucide-react';
import ClinicBrand from '@/components/ClinicBrand';
import ClinicMark from '@/components/ClinicMark';
import { supabase } from '@/lib/supabase/client';
import { getClinicAdmin, isDemoEnabled } from '@/lib/supabase/admin';
import styles from './login.module.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void getClinicAdmin().then(admin => { if (active && admin) router.replace('/admin'); });
    const params = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const hasError = params.has('error') || query.has('error') || query.get('reason') === 'access';
    if (hasError) Promise.resolve().then(() => { if (active) setError(query.get('reason') === 'access' ? 'Този Google профил няма лекарски достъп. Администраторът трябва да му зададе роля admin в Supabase.' : 'Входът не беше завършен. Опитайте отново.'); });
    return () => { active = false; };
  }, [router]);
  const login = async () => {
    if (!supabase) { setError('Google входът още не е свързан. Необходима е конфигурация на Supabase.'); return; }
    setBusy(true); setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/admin/`, queryParams: { prompt: 'select_account' } } });
      if (authError) { setError('Google входът не е наличен. Проверете настройката на Google доставчика и разрешения адрес за връщане в Supabase.'); setBusy(false); }
    } catch { setError('Не успяхме да се свържем. Проверете връзката и опитайте отново.'); setBusy(false); }
  };
  return <main className={styles.page}>
    <header className={styles.header}><ClinicBrand subtitle="Лекарски панел" /><Link href="/">Към сайта <ArrowRight size={15} /></Link></header>
    <div className={styles.layout}>
      <section className={styles.story}><span className="eyebrow">ДЕНТАЛНА ПРАКТИКА · ТЪРГОВИЩЕ</span><h1>Повече време<br />{' '}за Вашите<br />{' '}<em>пациенти.</em></h1><p>Едно спокойно място за организацията на кабинета.</p><div className={styles.features}><span><Check size={16} />График и свободни часове</span><span><Check size={16} />Пациенти и процедури</span><span><Check size={16} />Автоматични напомняния</span></div><ClinicMark className={styles.art} /></section>
      <section className={styles.card} aria-labelledby="login-title"><span className={styles.icon}><CalendarDays size={24} /></span><span className="eyebrow">ДОБРЕ ДОШЛИ</span><h2 id="login-title">Вход в кабинета</h2><p>Продължете с Вашия Google профил, за да отворите лекарския график.</p><button type="button" className={styles.google} disabled={busy} onClick={login}><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.73-.06-1.42-.19-2.09H12v3.96h5.92a5.07 5.07 0 0 1-2.2 3.33v2.77h3.56c2.08-1.92 3.28-4.74 3.28-7.97Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.68l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.87 0-5.3-1.94-6.17-4.55H2.15v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.83 14.06A6.6 6.6 0 0 1 5.48 12c0-.71.12-1.4.35-2.06V7.1H2.15A11 11 0 0 0 1 12c0 1.77.42 3.43 1.15 4.9l3.68-2.84Z"/><path fill="#EA4335" d="M12 5.39c1.62 0 3.06.56 4.21 1.64l3.16-3.16A10.57 10.57 0 0 0 12 1a11 11 0 0 0-9.85 6.1l3.68 2.84A6.58 6.58 0 0 1 12 5.39Z"/></svg>{busy ? 'Свързване с Google…' : 'Продължи с Google'}<ArrowRight size={16} /></button>{error && <p className={styles.error} role="alert">{error}</p>}<div className={styles.security}><LockKeyhole size={16} /><span>Достъп само за упълномощените администратори на кабинета.</span></div>{isDemoEnabled && <button type="button" className={styles.demo} onClick={() => { localStorage.setItem('dent_admin_authenticated', 'true'); router.push('/admin'); }}>Разгледай демо графика</button>}<Link className={styles.patient} href="/zapisi-chas">Пациент сте? Запазете час <ArrowRight size={14} /></Link></section>
    </div>
  </main>;
}
