'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserRound, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getAccountDestination } from '@/lib/supabase/admin';

export default function PatientAccountLink() {
  const [signedIn, setSignedIn] = useState(false);
  const [destination, setDestination] = useState('/vhod/');
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function updateDestination() {
      const target = await getAccountDestination();
      if (active) setDestination(target);
    }
    void supabase?.auth.getSession().then(({ data }) => { if (active) { setSignedIn(Boolean(data.session)); if (data.session) void updateDestination(); } });
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session)); clearTimeout(timer);
      if (session) timer = setTimeout(() => void updateDestination(), 0);
      else setDestination('/vhod/');
    }).data.subscription;
    return () => { active = false; clearTimeout(timer); subscription?.unsubscribe(); };
  }, []);
  return <Link href={destination} aria-label={signedIn ? 'Моят профил — влезли сте' : 'Вход'} title={signedIn ? 'Моят профил' : 'Вход / регистрация'} className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${signedIn ? 'border-purple-300 bg-purple-100 text-purple-900' : 'border-purple-100 bg-white text-purple-800 hover:bg-purple-50'}`}>
    <UserRound size={18} />
    {signedIn && <span className="absolute -right-0.5 -bottom-0.5 rounded-full border-2 border-white bg-purple-700 p-0.5 text-white"><Check size={10} strokeWidth={3} /></span>}
  </Link>;
}
