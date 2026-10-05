import Link from 'next/link';
import ClinicMark from './ClinicMark';

export default function ClinicBrand({ subtitle = 'Стоматолог · Търговище' }: { subtitle?: string }) {
  return <Link href="/" className="group flex items-center gap-3 min-w-0" aria-label="Д-р Джанел Аяз — към сайта">
    <span className="brand-mark shrink-0"><ClinicMark /></span>
    <span className="flex flex-col min-w-0">
      <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-slate-900 group-hover:text-purple-800 transition-colors leading-tight">Д-р Джанел Аяз</span>
      <span className="text-[11px] text-slate-400 tracking-wide">{subtitle}</span>
    </span>
  </Link>;
}
