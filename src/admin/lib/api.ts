import { supabase } from './supabase';

// Calls one of our own /api/admin/* functions with the current login attached.
// Throws an Error with the server's message when the call fails.
export async function api<T = unknown>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(path, {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    headers: {
      Authorization: `Bearer ${data.session?.access_token ?? ''}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json as T;
}
