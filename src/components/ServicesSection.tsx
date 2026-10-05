'use client';

import PremiumSelect from '@/components/PremiumSelect';

import { useState } from 'react';
import Link from 'next/link';
import { Service } from '@/types/database';
import { ArrowUpRight, LayoutGrid, List, ChevronDown } from 'lucide-react';
import styles from './ServicesSection.module.css';

export default function ServicesSection({ services }: { services: Service[] }) {
  const [category, setCategory] = useState('Всички');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const activeServices = services.filter(service => service.is_active);
  const categories = ['Всички', ...new Set(activeServices.map(s => s.category || 'Дентална грижа'))];
  const visibleServices = category === 'Всички' ? activeServices : activeServices.filter(s => (s.category || 'Дентална грижа') === category);

  return (
    <section id="services" className={styles.section}>
      <div className="clinic-container">
        <div className={styles.heading}><span className="eyebrow">ГРИЖА ЗА ВАШАТА УСМИВКА</span><h2>Услуги и прозрачни цени</h2><p>Изберете подходящата грижа. Планът и крайната цена се уточняват при прегледа.</p></div>
        <div className={styles.toolbar}>
          <div className={styles.filters}>{categories.map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
          <label className={styles.categorySelect}><span className="sr-only">Категория услуги</span><PremiumSelect aria-label="Категория услуги" value={category} onValueChange={setCategory}>{categories.map(item => <option key={item}>{item}</option>)}</PremiumSelect></label>
          <div className={styles.viewPicker} role="group" aria-label="Изглед на услугите"><button type="button" aria-label="Мрежа с услуги" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid size={17} /></button><button type="button" aria-label="Списък с услуги" aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={18} /></button></div>
        </div>
        <div className={`${styles.services} ${view === 'list' ? styles.list : styles.grid}`}>
          {visibleServices.map((service, index) => (
            <article key={service.id} className={styles.service}>
              <div className={styles.serviceInfo}><span className={styles.category}>{service.category || 'Дентална грижа'}</span><h3>{service.title}</h3><span className={styles.duration}>{service.duration_minutes} мин.</span></div>
              <div className={styles.price}><span>{service.price_bgn} <small>€</small></span><small>ориентировъчно</small></div>
              <details className={styles.details}><summary>За процедурата <ChevronDown size={12} /></summary><p>{service.description}</p></details>
              <Link href={`/zapisi-chas?service=${service.id}`} className={styles.book} aria-label={`Запазете час за ${service.title}`}>Запази час <ArrowUpRight size={15} /></Link>
              <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            </article>
          ))}
        </div>
        {visibleServices.length === 0 && <p className={styles.empty}>Няма активни услуги в тази категория. Изберете друга категория.</p>}
      </div>
    </section>
  );
}
