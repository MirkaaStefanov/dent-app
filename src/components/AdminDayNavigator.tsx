'use client';
import { useId } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './AdminDayNavigator.module.css';

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export default function AdminDayNavigator({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const id = useId();
  const current = new Date(`${date}T12:00:00`);
  const shift = (amount: number) => { const next = new Date(current); next.setDate(next.getDate() + amount); onChange(iso(next)); };
  const start = new Date(current); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => { const day = new Date(start); day.setDate(day.getDate() + i); return day; });
  return <div className={styles.navigator} role="group" aria-label="Избор на ден">
    <div className={styles.row}><div className={styles.title}><span>ИЗБРАН ДЕН</span><strong>{current.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' })}</strong></div><div className={styles.controls}><button type="button" aria-label="Предишен ден" onClick={() => shift(-1)}><ChevronLeft size={18} /></button><button type="button" onClick={() => onChange(iso(new Date()))}>Днес</button><button type="button" aria-label="Следващ ден" onClick={() => shift(1)}><ChevronRight size={18} /></button></div></div>
    <div className={styles.bottom}><div className={styles.week}>{days.map(day => <button type="button" key={iso(day)} aria-pressed={date === iso(day)} aria-label={day.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' })} onClick={() => onChange(iso(day))}><span>{day.toLocaleDateString('bg-BG', { weekday: 'short' })}</span><strong>{day.getDate()}</strong></button>)}</div><label className={styles.date} htmlFor={id}><span>Друга дата</span><input id={id} type="date" value={date} onChange={event => { if (event.target.value) onChange(event.target.value); }} /></label></div>
  </div>;
}
