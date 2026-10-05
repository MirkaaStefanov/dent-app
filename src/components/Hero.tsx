import Link from 'next/link';
import { ArrowUpRight, ArrowRight, Calendar, Check, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <section className="clinic-hero">
      <div className="clinic-container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow"><span className="status-dot" /> ДЕНТАЛНА ГРИЖА · ТЪРГОВИЩЕ</span>
          <h1>Повече спокойствие.<br />Повече поводи<br />за <em>усмивка.</em></h1>
          <p>Грижа за Вашата усмивка с внимание към Вас. Д-р Джанел Аяз — от първия преглед до индивидуалния план за лечение.</p>
          <div className="hero-actions">
            <Link href="/zapisi-chas" className="clinic-button">Запазете час <ArrowUpRight size={19} /></Link>
            <Link href="#services" className="clinic-text-link">Разгледайте услугите <ArrowRight size={17} /></Link>
          </div>
          <div className="hero-assurances"><span><Check size={16} /> Индивидуален подход</span><span><Check size={16} /> Онлайн записване</span></div>
        </div>
        <div className="smile-art" aria-label="Декоративна графика на усмивка в лилаво">
          <div className="art-topline"><span>Д-Р ДЖАНЕЛ АЯЗ</span><Sparkles size={22} /></div>
          <div className="smile-orbit orbit-one" /><div className="smile-orbit orbit-two" />
          <div className="smile-sculpture" aria-hidden="true"><div className="smile-shine" /></div>
          <div className="art-caption"><span>Всяка усмивка<br /><em>заслужава внимание.</em></span><span className="art-seal">ДЕНТАЛНА<br />ГРИЖА</span></div>
          <Link href="/zapisi-chas" className="art-booking"><span className="art-calendar"><Calendar size={21} /></span><span><strong>Вашият следващ преглед</strong><small>Изберете удобен ден и час</small></span><ArrowUpRight size={22} /></Link>
        </div>
      </div>
      <div className="clinic-container hero-footnote"><span>ПРОФИЛАКТИКА</span><span>ЛЕЧЕНИЕ</span><span>ЕСТЕТИКА</span><span>ДЕТСКА СТОМАТОЛОГИЯ</span></div>
    </section>
  );
}
