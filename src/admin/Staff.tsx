import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { api } from './lib/api';
import { isAdmin, useAuth } from './lib/auth';
import type { Role, StaffMember } from './lib/types';
import { Button, Card, Field, Input, PageHeader, Select, Spinner, formatDate, useToast } from './ui';

const ROLE_HELP: Record<Role, string> = {
  owner: 'Everything, including adding other owners',
  admin: 'Everything except managing owners',
  staff: 'Leads, customers, orders and website; no deleting or settings',
};

export function Staff() {
  const { profile } = useAuth();
  const toast = useToast();
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [invite, setInvite] = useState({ email: '', full_name: '', role: 'staff' as Role });
  const [busy, setBusy] = useState(false);
  const admin = isAdmin(profile);
  const roles: Role[] = profile?.role === 'owner' ? ['owner', 'admin', 'staff'] : ['admin', 'staff'];

  const load = useCallback(() => {
    api<{ staff: StaffMember[] }>('/api/admin/staff').then((r) => setStaff(r.staff)).catch((e) => toast(e.message, true));
  }, [toast]);

  useEffect(load, [load]);

  const sendInvite = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/admin/staff', { body: invite });
      toast(`Invite sent to ${invite.email}`);
      setInvite({ email: '', full_name: '', role: 'staff' });
      load();
    } catch (err) {
      toast((err as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (member: StaffMember, role: Role) => {
    try {
      await api('/api/admin/staff', { method: 'PATCH', body: { id: member.id, role } });
      toast(`${member.full_name || member.email} is now ${role}`);
      load();
    } catch (err) {
      toast((err as Error).message, true);
    }
  };

  const remove = async (member: StaffMember) => {
    if (!confirm(`Remove ${member.full_name || member.email}? They will no longer be able to log in.`)) return;
    try {
      await api('/api/admin/staff', { method: 'DELETE', body: { id: member.id } });
      toast('Removed');
      load();
    } catch (err) {
      toast((err as Error).message, true);
    }
  };

  // Admins can't change owners; nobody changes themselves
  const editable = (m: StaffMember) => admin && m.id !== profile?.id && (m.role !== 'owner' || profile?.role === 'owner');

  return (
    <>
      <PageHeader title="Staff" subtitle="Who can log in to this admin panel" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          {staff === null ? (
            <Spinner />
          ) : (
            <ul className="divide-y divide-gray-100">
              {staff.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-medium">{m.full_name || m.email}{m.id === profile?.id && <span className="text-gray-500"> (you)</span>}</p>
                    <p className="truncate text-xs text-gray-500">
                      {m.email} · {m.invited ? 'Invite sent, not joined yet' : m.last_sign_in_at ? `Last login ${formatDate(m.last_sign_in_at)}` : 'Never logged in'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {editable(m) ? (
                      <>
                        <Select value={m.role} onChange={(e) => changeRole(m, e.target.value as Role)} className="!w-28 !py-1.5" aria-label="Role">
                          {[...new Set([m.role, ...roles])].map((r) => <option key={r} value={r}>{r}</option>)}
                        </Select>
                        <button onClick={() => remove(m)} className="p-1 text-gray-400 hover:text-red-600" aria-label="Remove"><Trash2 size={18} /></button>
                      </>
                    ) : (
                      <span className="rounded-full bg-brand-beige px-3 py-1 text-xs font-semibold capitalize">{m.role}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          {admin ? (
            <Card className="p-5">
              <h2 className="mb-1 font-semibold">Invite someone</h2>
              <p className="mb-4 text-sm text-gray-500">They get an email with a link to set their password.</p>
              <form onSubmit={sendInvite} className="space-y-3">
                <Field label="Email *"><Input type="email" required value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} /></Field>
                <Field label="Name"><Input value={invite.full_name} onChange={(e) => setInvite({ ...invite, full_name: e.target.value })} /></Field>
                <Field label="Role" hint={ROLE_HELP[invite.role]}>
                  <Select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as Role })}>
                    {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </Field>
                <Button type="submit" disabled={busy} className="w-full"><UserPlus size={16} /> {busy ? 'Sending…' : 'Send invite'}</Button>
              </form>
            </Card>
          ) : (
            <Card className="p-5 text-sm text-gray-500">Only an owner or admin can invite or remove people.</Card>
          )}
          <Card className="space-y-2 p-5 text-sm">
            <h2 className="font-semibold">Roles</h2>
            {(Object.keys(ROLE_HELP) as Role[]).map((r) => <p key={r}><span className="font-semibold capitalize">{r}:</span> <span className="text-gray-600">{ROLE_HELP[r]}</span></p>)}
          </Card>
        </div>
      </div>
    </>
  );
}
