'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Pencil } from 'lucide-react';
import { Service, ServiceCategory, ClinicSettings } from '@/types/database';
import { addService, updateService, deleteService, getServiceCategories, saveServiceCategory, deleteServiceCategory, getServices, updateClinicSettings } from '@/lib/storage';
import styles from './ServiceManager.module.css';

export default function ServiceManager({ services, onChange, settings, onSettingsChange }: { services: Service[]; onChange: (services: Service[]) => void; settings: ClinicSettings | null; onSettingsChange: (settings: ClinicSettings) => void }) {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  const [draft, setDraft] = useState({ title: '', category: '', duration: '30', price: '', description: '' });
  const openEditor = (service: Service | 'new') => {
    const initial = service === 'new' ? { title: '', category: '', duration: '30', price: '', description: '' } : {
      title: service.title, category: service.category_id || categories.find(c => c.name === service.category)?.id || '',
      duration: String(service.duration_minutes), price: service.price_bgn == null ? '' : String(service.price_bgn), description: service.description || '',
    };
    const key = `dent_service_draft_${service === 'new' ? 'new' : service.id}`;
    try {
      const stored = sessionStorage.getItem(key);
      setDraft(stored ? { ...initial, ...JSON.parse(stored) } : initial);
    } catch { setDraft(initial); }
    setError(''); setSuccess(''); setEditing(service);
  };
  const updateDraft = (field: keyof typeof draft, value: string) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    try { sessionStorage.setItem(`dent_service_draft_${editing === 'new' ? 'new' : editing?.id}`, JSON.stringify(next)); } catch { /* Editing remains available when storage is full. */ }
  };
  const discardDraft = () => {
    try { sessionStorage.removeItem(`dent_service_draft_${editing === 'new' ? 'new' : editing?.id}`); } catch { /* Storage can be unavailable. */ }
    setEditing(null);
  };
  const [categoryEdit, setCategoryEdit] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { getServiceCategories().then(setCategories).catch(() => setError('Категориите не могат да се заредят.')); }, []);
  async function perform(action: () => Promise<void>) {
    setBusy(true); setError(''); setSuccess('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Промяната не беше записана.'); }
    finally { setBusy(false); }
  }
  return <div className={styles.manager}>
    {success && <p role="status" className={styles.success}>{success}</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div hidden={Boolean(editing)} className={styles.listScreen}>
    <div className={styles.toolbar}><label className={styles.switch}><input type="checkbox" checked={settings?.show_prices === true} disabled={busy || !settings} onChange={e => { const show_prices = e.target.checked; void perform(async () => onSettingsChange(await updateClinicSettings({ show_prices }))); }} /><span>Показвай цените в сайта<small>В услугите и при записване на час</small></span></label><button type="button" disabled={busy} onClick={() => openEditor('new')}>Добави услуга</button></div>
    <details className={styles.categories}><summary>Категории <span>{categories.length}</span></summary><div className={styles.categoryList}>{categories.map(c => {
      const count = services.filter(s => s.category_id === c.id || (!s.category_id && s.category === c.name)).length;
      return <div key={c.id} className={styles.categoryItem}>
        <button type="button" className={styles.secondary} disabled={busy} onClick={() => {setCategoryEdit(c.id); setCategoryName(c.name);}}>{c.name} · Редактирай</button>
        <span className={styles.categoryCount}>{count === 0 ? 'Празна категория' : `${count} услуги`}</span>
        {count === 0 && <button type="button" className={styles.danger} disabled={busy} aria-label={`Изтрий категория ${c.name}`} onClick={() => {
          if (confirm(`Да изтрием ли празната категория „${c.name}“?`)) void perform(async () => {
            await deleteServiceCategory(c.id);
            setCategories(await getServiceCategories());
            if (categoryEdit === c.id) {setCategoryEdit(''); setCategoryName('');}
          });
        }}>Изтрий</button>}
      </div>;
    })}</div><form onSubmit={e => {e.preventDefault(); void perform(async () => {await saveServiceCategory(categoryName, categoryEdit || undefined); setCategories(await getServiceCategories()); onChange(await getServices()); setCategoryName(''); setCategoryEdit('');});}}><label htmlFor="category-name">{categoryEdit ? 'Ново име на категорията' : 'Добави категория'}</label><div className={styles.inline}><input id="category-name" required maxLength={80} value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="Напр. Профилактика" /><button disabled={busy}>{categoryEdit ? 'Запази' : 'Добави'}</button>{categoryEdit && <button type="button" className={styles.secondary} onClick={() => {setCategoryEdit(''); setCategoryName('');}}>Отказ</button>}</div></form></details>
    <div className={styles.services}>{services.map(service => <article key={service.id}>
      <div className={styles.serviceInfo}>
        <h3><button type="button" className={styles.serviceName} disabled={busy} aria-label={`Редактирай ${service.title}`} onClick={() => openEditor(service)}>{service.title}<Pencil size={17} aria-hidden="true" /></button></h3>
        <small>{categories.find(c => c.id === service.category_id)?.name || service.category || 'Без категория'} · {service.duration_minutes} мин.</small>
        <p>{service.price_bgn == null ? 'Без обявена цена' : `${service.price_bgn} €`}{!service.is_active && ' · Скрита'}</p>
      </div>
      <div className={styles.serviceActions}>
        <button type="button" disabled={busy} onClick={() => openEditor(service)}><Pencil size={16} aria-hidden="true" />Редактирай</button>
        <details className={styles.serviceMore}><summary>Още<ChevronDown size={16} aria-hidden="true" /></summary><div>
          <button type="button" className={styles.secondary} disabled={busy} onClick={() => void perform(async () => {await updateService(service.id, {is_active: !service.is_active}); onChange(await getServices());})}>{service.is_active ? 'Скрий от сайта' : 'Покажи в сайта'}</button>
          <button type="button" className={styles.danger} disabled={busy} onClick={() => {if (confirm(`Да изтрием ли „${service.title}“?`)) void perform(async () => {await deleteService(service.id); onChange(await getServices());});}}>Изтрий услугата</button>
        </div></details>
      </div>
    </article>)}</div>
    </div>
    {editing && <section className={styles.editor} aria-labelledby="service-heading">
      {editing && <form key={typeof editing === 'string' ? editing : editing.id} onSubmit={e => {e.preventDefault(); const data = new FormData(e.currentTarget); const category = categories.find(c => c.id === data.get('category')); const price = String(data.get('price')).trim(); void perform(async () => {const payload = {title: String(data.get('title')).trim(), description: String(data.get('description')).trim(), category_id: category?.id || null, category: category?.name || '', duration_minutes: Number(data.get('duration')), price_bgn: price === '' ? null : Number(price)}; if (!payload.title) throw new Error('Въведете име на услугата.'); if (editing === 'new') await addService({...payload, is_active: true, sort_order: services.length + 1}); else await updateService(editing.id, payload); onChange(await getServices()); discardDraft(); setSuccess('Услугата е запазена.');});}}>
        <div className={styles.dialogHeading}><h2 id="service-heading">{editing === 'new' ? 'Нова услуга' : 'Редактиране на услуга'}</h2><button type="button" className={styles.secondary} aria-label="Назад към услугите" disabled={busy} onClick={() => setEditing(null)}>Назад</button></div>
        <fieldset disabled={busy} className={styles.editorFields}>
        <label>Име на услугата<input name="title" required maxLength={160} value={draft.title} onChange={e => updateDraft('title', e.target.value)} /></label>
        <label>Категория<select name="category" value={draft.category} onChange={e => updateDraft('category', e.target.value)}><option value="">Без категория</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <div className={styles.fields}><label>Продължителност (мин.)<input name="duration" type="number" required min={15} step={15} value={draft.duration} onChange={e => updateDraft('duration', e.target.value)} /></label><label>Цена (€) · по желание<input name="price" type="number" min={0} step="0.01" value={draft.price} onChange={e => updateDraft('price', e.target.value)} placeholder="Без цена" /></label></div>
        <label>Кратко описание<textarea name="description" rows={3} value={draft.description} onChange={e => updateDraft('description', e.target.value)} /></label>
        </fieldset>
        <div className={styles.actions}><button type="button" className={styles.secondary} disabled={busy} onClick={discardDraft}>Отказ</button><button disabled={busy}>{busy ? 'Записване…' : 'Запази услугата'}</button></div>
      </form>}
    </section>}
  </div>;
}
