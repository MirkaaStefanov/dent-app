import Link from 'next/link';
import { Lock } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-400 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800">

          <div>
            <span className="font-serif text-lg text-white font-semibold block">
              Д-р Джанел Аяз
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              Стоматологичен кабинет · гр. Търговище
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-6 text-sm">
            <Link href="/#services" className="hover:text-white transition-colors">
              Услуги
            </Link>
            <Link href="/zapisi-chas" className="hover:text-white transition-colors">
              Запазване на час
            </Link>
            <Link href="/#about" className="hover:text-white transition-colors">
              За кабинета
            </Link>
            <Link href="/#contacts" className="hover:text-white transition-colors">
              Контакти
            </Link>
          </nav>

        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; {currentYear} Д-р Джанел Аяз. Всички права запазени.
          </div>

          <div className="flex items-center gap-6">
            <a href="tel:+359888123456" className="hover:text-white transition-colors">
              088 812 3456
            </a>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-300 transition-colors"
            >
              <Lock className="w-3 h-3" />
              <span>Вход за лекар</span>
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
