import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from './lib/supabase';
import { isAdmin, useAuth } from './lib/auth';
import { DEFAULT_PHOTO_SETTINGS, getPhotoSettings, savePhotoSettings, type PhotoSettings } from './lib/photoSettings';
import { Button, Card, Field, Input, PageHeader, Select, Spinner, Textarea, useToast } from './ui';

function PhotoUploads({ canEdit }: { canEdit: boolean }) {
  const toast = useToast();
  const [form, setForm] = useState<PhotoSettings | null>(null);

  useEffect(() => {
    getPhotoSettings().then(setForm);
  }, []);

  if (!form) return <Card className="p-5"><Spinner /></Card>;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await savePhotoSettings(form);
      toast('Photo settings saved');
    } catch (err) {
      toast((err as Error).message, true);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="mb-1 font-semibold">Photo uploads</h2>
      <p className="mb-4 text-sm text-gray-500">Applied to every photo uploaded in the Website section, before it goes to the site.</p>
      <form onSubmit={save} className="space-y-4">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-brand-olive" checked={form.webp} disabled={!canEdit}
            onChange={(e) => setForm({ ...form, webp: e.target.checked })} />
          <span>
            <span className="block text-sm font-semibold">Convert to WebP automatically</span>
            <span className="block text-xs text-gray-500">Usually 80–95% smaller than JPG/PNG with no visible difference. SVG logos are kept as they are.</span>
          </span>
        </label>
        <Field label={`Quality: ${form.quality}`} hint="85 looks the same as the original for photos; lower = smaller files">
          <input type="range" min={60} max={100} step={5} value={form.quality} disabled={!canEdit || !form.webp}
            onChange={(e) => setForm({ ...form, quality: Number(e.target.value) })} className="w-full accent-brand-olive" />
        </Field>
        <Field label="Maximum width" hint="Wider photos are scaled down; smaller ones are never enlarged">
          <Select value={form.maxWidth} disabled={!canEdit} onChange={(e) => setForm({ ...form, maxWidth: Number(e.target.value) })}>
            {[1200, 1600, 2000, 2500, 3000].map((w) => <option key={w} value={w}>{w} px{w === DEFAULT_PHOTO_SETTINGS.maxWidth ? ' (recommended)' : ''}</option>)}
          </Select>
        </Field>
        {canEdit ? <Button type="submit">Save photo settings</Button> : <p className="text-xs text-gray-500">Only an admin can change this.</p>}
      </form>
    </Card>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Settings() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [alertEmails, setAlertEmails] = useState<string | null>(null);
  const [name, setName] = useState(profile?.full_name ?? '');

  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'lead_alert_emails')
      .maybeSingle()
      .then(({ data }) => setAlertEmails(Array.isArray(data?.value) ? data.value.join('\n') : ''));
  }, []);

  useEffect(() => setName(profile?.full_name ?? ''), [profile?.full_name]);

  const saveAlerts = async (e: FormEvent) => {
    e.preventDefault();
    const list = (alertEmails ?? '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    const bad = list.find((s) => !EMAIL_RE.test(s));
    if (bad) return toast(`"${bad}" isn't a valid email`, true);
    const { error } = await supabase.from('settings').upsert({ key: 'lead_alert_emails', value: list, updated_at: new Date().toISOString() });
    if (error) return toast(error.message, true);
    setAlertEmails(list.join('\n'));
    toast('Alert emails saved');
  };

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', profile!.id);
    if (error) return toast(error.message, true);
    await refreshProfile();
    toast('Name saved');
  };

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-1 font-semibold">Lead alerts</h2>
          <p className="mb-4 text-sm text-gray-500">Every new contact or proposal enquiry is emailed to these addresses.</p>
          {alertEmails === null ? (
            <Spinner />
          ) : (
            <form onSubmit={saveAlerts} className="space-y-3">
              <Field label="Send alerts to" hint="One email per line">
                <Textarea rows={4} value={alertEmails} onChange={(e) => setAlertEmails(e.target.value)} disabled={!isAdmin(profile)} />
              </Field>
              {isAdmin(profile) ? <Button type="submit">Save alerts</Button> : <p className="text-xs text-gray-500">Only an admin can change this.</p>}
            </form>
          )}
        </Card>

        <PhotoUploads canEdit={isAdmin(profile)} />

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Your profile</h2>
          <form onSubmit={saveName} className="space-y-3">
            <Field label="Your name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Email">
              <Input value={profile?.email ?? ''} disabled />
            </Field>
            <Button type="submit">Save</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
