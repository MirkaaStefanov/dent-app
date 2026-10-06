import type { User } from '@supabase/supabase-js';
import { supabase } from './client';

export async function getPatientContact(user?: User) {
  if (!supabase) return null;
  const currentUser = user || (await supabase.auth.getUser()).data.user;
  if (!currentUser) return null;
  const { data: profile } = await supabase.from('profiles').select('full_name, phone').eq('id', currentUser.id).maybeSingle();
  return {
    email: currentUser.email || '',
    name: currentUser.user_metadata.full_name || currentUser.user_metadata.name || profile?.full_name || '',
    phone: currentUser.user_metadata.contact_phone || profile?.phone || '',
  };
}
