'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import ClinicBrand from '@/components/ClinicBrand';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { getAccountDestination } from '@/lib/supabase/admin';
import styles from './patient-auth.module.css';

function PatientLogin() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const destination = '/vhod/';
  const [checkingSession, setCheckingSession] = useState(true);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function openProfile() {
      const target = await getAccountDestination();
      if (active) router.replace(target);
    }
    void supabase?.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) void openProfile();
      else setCheckingSession(false);
    });
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      if (session) { clearTimeout(timer); timer = setTimeout(() => void openProfile(), 0); }
    }).data.subscription;
    return () => { active = false; clearTimeout(timer); subscription?.unsubscribe(); };
  }, [router]);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !isSupabaseConfigured) {
      setError('Входът временно не е достъпен. Моля, опитайте отново по-късно.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const submittedEmail = String(new FormData(event.currentTarget).get('email') || '').trim();
    const redirectTo = `${window.location.origin}${destination.startsWith('/') ? destination : '/moite-rezervacii/'}`;
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: submittedEmail,
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(false);
    if (authError) {
      setError('Не успяхме да изпратим защитения линк. Проверете имейла и опитайте отново.');
      return;
    }
    sessionStorage.setItem('dent_patient_email', submittedEmail);
    setMessage('Изпратихме Ви защитен линк. Отворете го от имейла си, за да влезете.');
  }

  async function signInWithGoogle() {
    if (!supabase || !isSupabaseConfigured) {
      setError('Входът временно не е достъпен.');
      return;
    }
    setBusy(true);
    setError(null);
    const redirectTo = `${window.location.origin}${destination.startsWith('/') ? destination : '/moite-rezervacii/'}`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (authError) {
      setBusy(false);
      setError('Входът с Google не успя. Опитайте отново или използвайте имейл.');
    }
  }

  if (checkingSession && supabase) return <main className={styles.page}><p className="p-12 text-center text-purple-800">Отваряме профила Ви…</p></main>;
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <ClinicBrand />
          <Link href="/" className={styles.back}><ArrowLeft size={16} /> Към сайта</Link>
        </header>

        <section className={styles.grid}>
          <div className={styles.intro}>
            <span className={styles.eyebrow}>ВАШИЯТ ЛИЧЕН ПРОФИЛ</span>
            <h1>Вашите посещения,<br /><em>на едно място.</em></h1>
            <p>Входът е по желание. Можете да запазите час и без регистрация.</p>
            <ul>
              <li><CalendarDays /><span><strong>Преглеждате часовете си</strong>Предстоящи и минали посещения със статус.</span></li>
              <li><ShieldCheck /><span><strong>Сигурно свързване</strong>Старите часове се показват само след потвърден имейл.</span></li>
              <li><CheckCircle2 /><span><strong>Без парола</strong>Получавате еднократен защитен линк по имейл.</span></li>
            </ul>
          </div>

          <div className={styles.card}>
            <span className={styles.kicker}>Вход или регистрация</span>
            <h2>Добре дошли</h2>
            <p className={styles.lead}>Влезте с Google или имейл. Лекарите отварят панела на кабинета, а пациентите — своите резервации.</p>

            <button type="button" className={styles.google} onClick={signInWithGoogle} disabled={busy}>
              <span className={styles.googleMark}>G</span> Продължи с Google
            </button>

            <div className={styles.divider}><span>или с имейл</span></div>

            <form onSubmit={sendMagicLink} className={styles.form}>
              <label htmlFor="patient-email">Имейл адрес</label>
              <div className={styles.inputWrap}>
                <Mail size={18} />
                <input id="patient-email" name="email" type="email" required autoComplete="email" defaultValue="" placeholder="ime@example.com" />
              </div>
              <button type="submit" className={styles.submit} disabled={busy}>{busy ? 'Моля, изчакайте…' : 'Изпрати защитен линк'}</button>
            </form>

            {message && <p className={styles.success} role="status">{message}</p>}
            {error && <p className={styles.error} role="alert">{error}</p>}
            <p className={styles.finePrint}>С продължаването потвърждавате, че имейлът е Ваш. Не изпращаме рекламни съобщения.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function PatientLoginPage() {
  return <Suspense fallback={<main className={styles.page} />}><PatientLogin /></Suspense>;
}
