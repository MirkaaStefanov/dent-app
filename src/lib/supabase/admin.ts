import { supabase, isSupabaseConfigured } from './client';

export const isDemoEnabled = !isSupabaseConfigured && process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true';
export async function getAccountDestination() {
  return await getClinicAdmin() ? '/admin/' : '/moite-rezervacii/';
}

export async function getClinicAdmin() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const user = data.user;
    // app_metadata is managed by the server; profiles.role has no client write policy.
    let isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      isAdmin = profile?.role === 'admin';
    }
    return isAdmin ? { email: user.email || '', name: user.user_metadata?.full_name || 'Администратор' } : null;
  } catch { return null; }
}
