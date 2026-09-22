import Link from 'next/link';
import { Lock } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#180928] text-purple-200/70 py-12 border-t border-purple-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-8 border-b border-purple-900/50">
          
          <div className="space-y-1">
            <span className="font-serif text-xl text-white font-bold block">
              Д-р Джанел Аяз
            </span>
            <p className="text-xs text-purple-300/80">
              Стоматологичен кабинет &middot; гр. Търговище, бул. „Васил Левски“ №12, ет. 2, каб. 4
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-6 text-xs sm:text-sm text-purple-200/90 font-medium">
            <Link href="/#services" className="hover:text-white transition-colors">
              Услуги и цени
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

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-purple-300/60">
          <div>
            &copy; {currentYear} Д-р Джанел Аяз. Всички права запазени.
          </div>

          <div className="flex items-center gap-6">
            <a href="tel:+359888123456" className="text-purple-200 hover:text-white font-semibold transition-colors">
              Тел: 088 812 3456
            </a>
            <Link 
              href="/admin" 
              className="inline-flex items-center gap-1 text-purple-300/60 hover:text-purple-100 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Вход за лекар</span>
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
