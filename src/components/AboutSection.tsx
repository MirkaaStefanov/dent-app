import Link from 'next/link';
import { ArrowUpRight, Heart, MessageCircle, Smile } from 'lucide-react';

const values = [
  { icon: MessageCircle, title: 'Първо Ви изслушваме', text: 'Споделете какво Ви притеснява и какво искате да промените в усмивката си.' },
  { icon: Heart, title: 'План, съобразен с Вас', text: 'Обсъждаме възможностите и следващите стъпки на разбираем език.' },
  { icon: Smile, title: 'Внимание на всяка стъпка', text: 'Спокоен подход както към възрастните, така и към най-малките пациенти.' },
];

export default function AboutSection() {
  return (
    <section id="about" className="clinic-about">
      <div className="clinic-container about-grid">
        <div className="doctor-card"><span className="eyebrow">ВАШИЯТ СТОМАТОЛОГ</span><div className="doctor-monogram" aria-hidden="true">ДА<span>✧</span></div><h3>Д-р Джанел Аяз</h3><p>Лекар по дентална медицина<br />гр. Търговище</p><div className="doctor-card-bottom">Лично отношение. Внимателна грижа.</div></div>
        <div><span className="eyebrow">ПОДХОДЪТ НИ</span><h2>Добрата грижа започва<br />с <em>доверие.</em></h2><p className="about-intro">Посещението при стоматолог е лична стъпка. Затова отделяме внимание на въпросите Ви, на комфорта Ви и на решенията, които са подходящи за Вас.</p><div className="practice-values">{values.map(({ icon: Icon, title, text }) => <div key={title}><span className="value-icon"><Icon size={21} /></span><div><h3>{title}</h3><p>{text}</p></div></div>)}</div><Link href="/zapisi-chas" className="clinic-text-link">Нека започнем с преглед <ArrowUpRight size={18} /></Link></div>
      </div>
    </section>
  );
}
