'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Clock3, LogOut, MapPin, Plus, ShieldCheck } from 'lucide-react';
import ClinicBrand from '@/components/ClinicBrand';
import { getMyAppointments } from '@/lib/storage';
import { formatBulgarianDate } from '@/lib/notifications';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { Appointment, AppointmentStatus } from '@/types/database';
import styles from './bookings.module.css';

const statusText: Record<AppointmentStatus, string> = {
  confirmed: 'Потвърден',
  completed: 'Завършен',
  cancelled: 'Отменен',
  no_show: 'Неявяване',
};

function isUpcoming(appointment: Appointment) {
  const now = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Sofia', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  const today = `${now.year}-${now.month}-${now.day}`;
  const currentTime = `${now.hour}:${now.minute}`;
  return appointment.date > today || (appointment.date === today && appointment.end_time.slice(0, 5) >= currentTime);
}

export default function MyBookingsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !isSupabaseConfigured) {
        if (active) { setError('Онлайн профилът временно не е достъпен.'); setLoading(false); }
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) { setSignedIn(false); setLoading(false); return; }
      setSignedIn(true);
      setUserEmail(data.user.email || '');
      try {
        setAppointments(await getMyAppointments());
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Часовете не могат да бъдат заредени.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const { data: listener } = supabase?.auth.onAuthStateChange(() => void load()) || { data: null };
    return () => { active = false; listener?.subscription.unsubscribe(); };
  }, []);

  const grouped = useMemo(() => ({
    upcoming: appointments.filter(isUpcoming).sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`)),
    past: appointments.filter((appointment) => !isUpcoming(appointment)).sort((a, b) => `${b.date}${b.start_time}`.localeCompare(`${a.date}${a.start_time}`)),
  }), [appointments]);

  async function signOut() {
    await supabase?.auth.signOut();
    setSignedIn(false);
    setAppointments([]);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <ClinicBrand />
        <div className={styles.headerActions}>
          <Link href="/zapisi-chas" className={styles.book}><Plus size={17} /> Нов час</Link>
          {signedIn && <button type="button" onClick={signOut} className={styles.logout}><LogOut size={16} /> Изход</button>}
        </div>
      </header>

      <section className={styles.hero}>
        <span>ПАЦИЕНТСКИ ПРОФИЛ</span>
        <h1>Моите резервации</h1>
        <p>{userEmail || 'Преглеждайте предстоящите и миналите си посещения.'}</p>
      </section>

      <section className={styles.content}>
        {loading ? (
          <div className={styles.state}><div className={styles.spinner} /><h2>Зареждаме Вашите часове…</h2></div>
        ) : !signedIn ? (
          <div className={styles.state}>
            <ShieldCheck size={34} />
            <h2>Влезте, за да видите часовете си</h2>
            <p>След потвърждение на имейла ще свържем и резервациите, които сте направили като гост със същия адрес.</p>
            <Link href="/vhod?next=/moite-rezervacii/" className={styles.primary}>Вход или регистрация</Link>
            <Link href="/zapisi-chas" className={styles.secondary}>Запазване без регистрация</Link>
          </div>
        ) : error ? (
          <div className={styles.state}><h2>Не успяхме да заредим часовете</h2><p>{error}</p><button type="button" onClick={() => window.location.reload()} className={styles.primary}>Опитайте отново</button></div>
        ) : (
          <>
            <div className={styles.tabs} role="tablist" aria-label="Вид резервации">
              <button type="button" role="tab" aria-selected={tab === 'upcoming'} onClick={() => setTab('upcoming')}>Предстоящи <span>{grouped.upcoming.length}</span></button>
              <button type="button" role="tab" aria-selected={tab === 'past'} onClick={() => setTab('past')}>Минали <span>{grouped.past.length}</span></button>
            </div>

            {grouped[tab].length === 0 ? (
              <div className={styles.state}><CalendarDays size={34} /><h2>{tab === 'upcoming' ? 'Нямате предстоящи часове' : 'Все още нямате минали посещения'}</h2>{tab === 'upcoming' && <Link href="/zapisi-chas" className={styles.primary}>Запазете час</Link>}</div>
            ) : (
              <div className={styles.list}>
                {grouped[tab].map((appointment) => (
                  <article key={appointment.id} className={styles.appointment}>
                    <div className={styles.date}><strong>{new Date(`${appointment.date}T12:00:00`).getDate()}</strong><span>{new Intl.DateTimeFormat('bg-BG', { month: 'short' }).format(new Date(`${appointment.date}T12:00:00`))}</span></div>
                    <div className={styles.details}>
                      <div className={styles.titleRow}><h2>{appointment.service_title}</h2><span className={`${styles.status} ${styles[appointment.status]}`}>{statusText[appointment.status]}</span></div>
                      <div className={styles.meta}><span><CalendarDays /> {formatBulgarianDate(appointment.date)}</span><span><Clock3 /> {appointment.start_time.slice(0, 5)} – {appointment.end_time.slice(0, 5)} ч.</span><span><MapPin /> бул. „Васил Левски“ №12, ет. 2</span></div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
