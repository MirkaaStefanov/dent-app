'use client';

import { useEffect, useRef, useState } from 'react';
import { Service, ServiceCategory, ClinicSettings } from '@/types/database';
import { addService, updateService, deleteService, getServiceCategories, saveServiceCategory, getServices, updateClinicSettings } from '@/lib/storage';
import styles from './ServiceManager.module.css';

export default function ServiceManager({ services, onChange, settings, onSettingsChange }: { services: Service[]; onChange: (services: Service[]) => void; settings: ClinicSettings | null; onSettingsChange: (settings: ClinicSettings) => void }) {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  const [categoryEdit, setCategoryEdit] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { getServiceCategories().then(setCategories).catch(() => setError('Категориите не могат да се заредят.')); }, []);
  useEffect(() => { if (editing) dialog.current?.showModal(); else dialog.current?.close(); }, [editing]);
  async function perform(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Промяната не беше записана.'); }
    finally { setBusy(false); }
  }
  return <div className={styles.manager}>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.toolbar}><label className={styles.switch}><input type="checkbox" checked={settings?.show_prices === true} disabled={busy || !settings} onChange={e => { const show_prices = e.target.checked; void perform(async () => onSettingsChange(await updateClinicSettings({ show_prices }))); }} /><span>Показвай цените в сайта<small>В услугите и при записване на час</small></span></label><button type="button" disabled={busy} onClick={() => setEditing('new')}>Добави услуга</button></div>
    <details className={styles.categories}><summary>Категории <span>{categories.length}</span></summary><div className={styles.categoryList}>{categories.map(c => <button type="button" className={styles.secondary} key={c.id} onClick={() => {setCategoryEdit(c.id); setCategoryName(c.name);}}>{c.name} · Редактирай</button>)}</div><form onSubmit={e => {e.preventDefault(); void perform(async () => {await saveServiceCategory(categoryName, categoryEdit || undefined); setCategories(await getServiceCategories()); onChange(await getServices()); setCategoryName(''); setCategoryEdit('');});}}><label htmlFor="category-name">{categoryEdit ? 'Ново име на категорията' : 'Добави категория'}</label><div className={styles.inline}><input id="category-name" required maxLength={80} value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="Напр. Профилактика" /><button disabled={busy}>{categoryEdit ? 'Запази' : 'Добави'}</button>{categoryEdit && <button type="button" className={styles.secondary} onClick={() => {setCategoryEdit(''); setCategoryName('');}}>Отказ</button>}</div></form></details>
    <div className={styles.services}>{services.map(service => <article key={service.id}><div><small>{categories.find(c => c.id === service.category_id)?.name || service.category || 'Без категория'} · {service.duration_minutes} мин.</small><h3>{service.title}</h3><p>{service.price_bgn == null ? 'Без обявена цена' : `${service.price_bgn} €`}{!service.is_active && ' · Скрита'}</p></div><div className={styles.actions}><button type="button" className={styles.secondary} disabled={busy} onClick={() => setEditing(service)}>Редактирай</button><button type="button" className={styles.secondary} disabled={busy} onClick={() => void perform(async () => {await updateService(service.id, {is_active: !service.is_active}); onChange(await getServices());})}>{service.is_active ? 'Скрий' : 'Покажи'}</button><button type="button" className={styles.danger} disabled={busy} onClick={() => {if (confirm(`Да изтрием ли „${service.title}“?`)) void perform(async () => {await deleteService(service.id); onChange(await getServices());});}}>Изтрий</button></div></article>)}</div>
    <dialog ref={dialog} className={styles.dialog} onCancel={() => setEditing(null)} onClose={() => setEditing(null)} aria-labelledby="service-heading">
      {editing && <form key={typeof editing === 'string' ? editing : editing.id} onSubmit={e => {e.preventDefault(); const data = new FormData(e.currentTarget); const category = categories.find(c => c.id === data.get('category')); const price = String(data.get('price')).trim(); void perform(async () => {const payload = {title: String(data.get('title')).trim(), description: String(data.get('description')).trim(), category_id: category?.id || null, category: category?.name || '', duration_minutes: Number(data.get('duration')), price_bgn: price === '' ? null : Number(price)}; if (!payload.title) throw new Error('Въведете име на услугата.'); if (editing === 'new') await addService({...payload, is_active: true, sort_order: services.length + 1}); else await updateService(editing.id, payload); onChange(await getServices()); setEditing(null);});}}>
        <div className={styles.dialogHeading}><h2 id="service-heading">{editing === 'new' ? 'Нова услуга' : 'Редактиране на услуга'}</h2><button type="button" className={styles.secondary} aria-label="Затвори" onClick={() => setEditing(null)}>×</button></div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <label>Име на услугата<input name="title" required maxLength={160} autoFocus defaultValue={editing === 'new' ? '' : editing.title} /></label>
        <label>Категория<select name="category" defaultValue={editing === 'new' ? '' : editing.category_id || categories.find(c => c.name === editing.category)?.id || ''}><option value="">Без категория</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <div className={styles.fields}><label>Продължителност (мин.)<input name="duration" type="number" required min={15} step={15} defaultValue={editing === 'new' ? 30 : editing.duration_minutes} /></label><label>Цена (€) · по желание<input name="price" type="number" min={0} step="0.01" defaultValue={editing === 'new' ? '' : editing.price_bgn ?? ''} placeholder="Без цена" /></label></div>
        <label>Кратко описание<textarea name="description" rows={3} defaultValue={editing === 'new' ? '' : editing.description} /></label>
        <div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => setEditing(null)}>Отказ</button><button disabled={busy}>{busy ? 'Записване…' : 'Запази услугата'}</button></div>
      </form>}
    </dialog>
  </div>;
}
