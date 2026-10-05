'use client';

import Link from 'next/link';
import { Phone, Calendar } from 'lucide-react';

export default function MobileBottomBar() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-purple-100 px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3">
      <a
        href="tel:+359888123456"
        className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl border border-purple-100 text-slate-700 font-semibold text-xs sm:text-sm bg-white active:bg-gray-50 transition-colors"
      >
        <Phone className="w-3.5 h-3.5" />
        <span>088 812 3456</span>
      </a>

      <Link
        href="/zapisi-chas"
        className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-purple-800 active:bg-purple-900 text-white font-semibold text-xs sm:text-sm transition-colors text-center"
      >
        <Calendar className="w-3.5 h-3.5" />
        <span>Запази час</span>
      </Link>
    </div>
  );
}
