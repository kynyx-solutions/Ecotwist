import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Profile } from './types';

let cached: Promise<Profile[]> | null = null;

// Everyone on the staff list (for "Owner" pickers and names), loaded once per visit
export function useStaff() {
  const [staff, setStaff] = useState<Profile[]>([]);
  useEffect(() => {
    cached ??= Promise.resolve(supabase.from('profiles').select('*').order('full_name')).then(({ data }) => (data as Profile[]) ?? []);
    cached.then(setStaff);
  }, []);
  return staff;
}

export const staffName = (staff: Profile[], id: string | null) => {
  const p = id ? staff.find((s) => s.id === id) : null;
  return p ? p.full_name || p.email.split('@')[0] : 'Unassigned';
};
