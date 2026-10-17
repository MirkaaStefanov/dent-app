import { createClient } from '@supabase/supabase-js';
import type { SenderConfig, Channel } from './reminders';

export function senderConfig(): SenderConfig {
  const resendKey = Netlify.env.get('RESEND_API_KEY');
  const emailFrom = Netlify.env.get('REMINDER_EMAIL_FROM');
  const twilioSid = Netlify.env.get('TWILIO_ACCOUNT_SID');
  const twilioToken = Netlify.env.get('TWILIO_AUTH_TOKEN');
  const smsFrom = Netlify.env.get('TWILIO_FROM_NUMBER');
  const channels: Channel[] = [];
  if (resendKey && emailFrom) channels.push('email');
  if (twilioSid && twilioToken && smsFrom) channels.push('sms');
  return { enabled: Netlify.env.get('REMINDERS_ENABLED') === 'true', channels, resendKey, emailFrom, twilioSid, twilioToken, smsFrom };
}

export function serverDatabase() {
  const url = Netlify.env.get('SUPABASE_URL') || Netlify.env.get('NEXT_PUBLIC_SUPABASE_URL');
  const key = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(3000) }) } });
}

export async function getAuthorizedAdmin(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  const url = Netlify.env.get('SUPABASE_URL') || Netlify.env.get('NEXT_PUBLIC_SUPABASE_URL');
  const key = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY') || Netlify.env.get('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || Netlify.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!url || !key) return null;
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(3000) }) } });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  if (data.user.app_metadata?.role === 'admin') return data.user;
  const { data: profile } = await db.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  return profile?.role === 'admin' ? data.user : null;
}

export async function authorizeAdmin(request: Request) {
  return Boolean(await getAuthorizedAdmin(request));
}
