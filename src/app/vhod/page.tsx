'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, CheckCircle2, ShieldCheck } from 'lucide-react';
import ClinicBrand from '@/components/ClinicBrand';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { getAccountDestination } from '@/lib/supabase/admin';
import styles from './patient-auth.module.css';

function PatientLogin() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
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
      setError('Входът с Google не успя. Моля, опитайте отново.');
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
              <li><CheckCircle2 /><span><strong>Без парола</strong>Влизате лесно и сигурно с Google профила си.</span></li>
            </ul>
          </div>

          <div className={styles.card}>
            <span className={styles.kicker}>Вход или регистрация</span>
            <h2>Добре дошли</h2>
            <p className={styles.lead}>Влезте с Google. Лекарите отварят панела на кабинета, а пациентите — своите резервации.</p>

            <button type="button" className={styles.google} onClick={signInWithGoogle} disabled={busy}>
              <span className={styles.googleMark}>G</span> {busy ? 'Пренасочване към Google…' : 'Продължи с Google'}
            </button>

            {error && <p className={styles.error} role="alert">{error}</p>}
            <p className={styles.finePrint}>При първи вход създаваме Вашия профил автоматично. Не изпращаме рекламни съобщения.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function PatientLoginPage() {
  return <Suspense fallback={<main className={styles.page} />}><PatientLogin /></Suspense>;
}
