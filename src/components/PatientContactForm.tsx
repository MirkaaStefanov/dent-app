'use client';
import { FormEvent, useEffect, useState } from 'react';
import { Phone, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getPatientContact } from '@/lib/supabase/patient';

export default function PatientContactForm() {
  const [contact, setContact] = useState<{ name: string; phone: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [deferred, setDeferred] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; void getPatientContact().then(value => { if (active && value) setContact(value); }); return () => { active = false; }; }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    if (!/^\+?[\d\s()-]{7,20}$/.test(phone)) { setError('Въведете валиден телефон за връзка.'); return; }
    setBusy(true); setError('');
    const result = await supabase?.auth.updateUser({ data: { full_name: name, contact_phone: phone } });
    setBusy(false);
    if (!result || result.error) { setError('Данните не са записани. Опитайте отново.'); return; }
    setContact({ name, phone }); setEditing(false);
  }
  if (!contact) return null;
  if (!editing && (contact.phone || deferred)) return <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-purple-100 bg-white p-5"><div className="flex items-center gap-3 text-sm text-purple-900"><CheckCircle2 size={19} /><span>{contact.phone ? `${contact.name || 'Вашият профил'} · ${contact.phone}` : 'Можете да допълните телефона си по всяко време.'}</span></div><button type="button" onClick={() => setEditing(true)} className="text-sm font-bold text-purple-800">Редактирай данните</button></div>;
  return <section className="mb-6 rounded-3xl border border-purple-200 bg-white p-6 sm:p-8"><div className="flex items-center gap-3"><Phone size={22} className="text-purple-800" /><h2 className="font-serif text-2xl">Допълнете профила си</h2></div><p className="mt-2 text-sm text-slate-600">Добавете телефон за връзка с кабинета. Ще попълваме данните Ви при следващо записване.</p><form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Вашето име<input name="name" required autoComplete="name" defaultValue={contact.name} className="mt-2 w-full rounded-xl border border-purple-200 bg-purple-50/30 p-3 outline-purple-700" /></label><label className="text-sm font-semibold">Телефон<input name="phone" required type="tel" autoComplete="tel" defaultValue={contact.phone} placeholder="0888 123 456" className="mt-2 w-full rounded-xl border border-purple-200 bg-purple-50/30 p-3 outline-purple-700" /></label><div className="flex flex-wrap items-center gap-4 sm:col-span-2"><button disabled={busy} className="rounded-full bg-purple-800 px-6 py-3 text-sm font-bold text-white">{busy ? 'Записваме…' : 'Запази данните'}</button><button type="button" onClick={() => { setDeferred(true); setEditing(false); }} className="px-3 py-3 text-sm font-bold text-slate-500">По-късно</button></div>{error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}</form></section>;
}
