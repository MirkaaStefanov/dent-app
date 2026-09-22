'use client';

import Link from 'next/link';
import { Phone, Calendar } from 'lucide-react';

export default function MobileBottomBar() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#faf8fc]/95 backdrop-blur-md border-t border-purple-100 px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_10px_rgba(107,33,168,0.06)] flex items-center gap-3">
      <a
        href="tel:+359888123456"
        className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-full border border-purple-200 text-purple-900 font-bold text-xs sm:text-sm bg-white active:bg-purple-50 transition-colors"
      >
        <Phone className="w-3.5 h-3.5 text-purple-700" />
        <span>088 812 3456</span>
      </a>

      <Link
        href="/zapisi-chas"
        className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-full bg-purple-800 active:bg-purple-900 text-white font-bold text-xs sm:text-sm shadow-md shadow-purple-900/20 transition-all text-center"
      >
        <Calendar className="w-3.5 h-3.5" />
        <span>Запази час</span>
      </Link>
    </div>
  );
}
