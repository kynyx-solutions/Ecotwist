import { useState, type FormEvent, type ReactNode } from 'react';
import { supabase, isConfigured } from './lib/supabase';
import { Button, Field, Input } from './ui';

const LOGO = '/site/navigation/logo.png';

// Dark backdrop with a soft gold glow, white card in the middle
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ background: 'radial-gradient(ellipse at 70% 15%, rgba(197,160,89,0.18), transparent 55%), #121410' }}
    >
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-8 shadow-2xl">
        <img src={LOGO} alt="Ecotwist" className="mx-auto mb-4 h-14 object-contain" />
        <h1 className="text-center font-serif text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-center text-sm text-gray-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function ErrorText({ text }: { text: string }) {
  return text ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{text}</p> : null;
}

export function SetupNotice() {
  return (
    <AuthCard title="Almost there" subtitle="The admin isn't connected to Supabase yet">
      <p className="text-sm text-gray-600">
        Add <code className="rounded bg-gray-100 px-1">VITE_SUPABASE_URL</code> and{' '}
        <code className="rounded bg-gray-100 px-1">VITE_SUPABASE_ANON_KEY</code> to <code className="rounded bg-gray-100 px-1">.env.local</code>{' '}
        (and to the Vercel project settings), then restart the dev server.
      </p>
    </AuthCard>
  );
}

export function LoginScreen({ onForgot }: { onForgot: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isConfigured) return <SetupNotice />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message);
  };

  return (
    <AuthCard title="Admin login" subtitle="Ecotwist">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <ErrorText text={error} />
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Logging in…' : 'Log in'}</Button>
        <button type="button" onClick={onForgot} className="text-sm text-brand-olive underline underline-offset-2">
          Forgot password?
        </button>
      </form>
    </AuthCard>
  );
}

export function ForgotScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin/reset`,
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <AuthCard title="Reset password" subtitle="We'll email you a link to set a new one">
      {sent ? (
        <p className="text-sm text-gray-600">If an account exists for <strong>{email}</strong>, a reset link is on its way. Check your inbox.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <ErrorText text={error} />
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Sending…' : 'Send reset link'}</Button>
        </form>
      )}
      <button type="button" onClick={onBack} className="mt-4 text-sm text-brand-olive underline underline-offset-2">
        Back to login
      </button>
    </AuthCard>
  );
}

// Shown after following a reset (or invite) link; the link has already signed the user in
export function NewPasswordScreen({ title = 'Set a new password', onDone }: { title?: string; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== repeat) return setError("The passwords don't match.");
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else onDone();
  };

  return (
    <AuthCard title={title}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password" hint="At least 8 characters">
          <Input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Repeat password">
          <Input type="password" autoComplete="new-password" required value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        </Field>
        <ErrorText text={error} />
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Saving…' : 'Save password'}</Button>
      </form>
    </AuthCard>
  );
}
