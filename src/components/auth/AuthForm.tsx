'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/app';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);

    try {
      const supabase = createClient();

      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          },
        });
        if (signUpError) throw signUpError;

        // Supabase returns a session immediately only when email confirmation is off.
        if (data.session) {
          router.push('/onboarding');
          router.refresh();
          return;
        }
        setNotice('Check your inbox — confirm your email to start generating.');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      router.push(next);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (oauthError) throw oauthError;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Google sign-in is unavailable');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <button
        type="button"
        onClick={handleGoogle}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-pill border border-hairline text-sm text-ink-primary transition hover:bg-white/5"
      >
        <GoogleMark />
        Continue with Google
      </button>

      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-hairline" />
        <span className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">or</span>
        <span className="h-px flex-1 bg-hairline" />
      </div>

      {mode === 'signup' ? (
        <Field label="Your name">
          <Input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Priya Sharma"
            autoComplete="name"
          />
        </Field>
      ) : null}

      <Field label="Email">
        <Input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@business.com"
          autoComplete="email"
        />
      </Field>

      <Field label="Password" hint={mode === 'signup' ? 'At least 8 characters.' : undefined}>
        <Input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />
      </Field>

      {error ? (
        <p className="rounded-[10px] border border-[#e5735a]/30 bg-[#e5735a]/10 px-3.5 py-2.5 text-[13px] text-[#e5735a]">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-[10px] border border-accent/30 bg-accent-soft px-3.5 py-2.5 text-[13px] text-accent">
          {notice}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? 'One moment…' : mode === 'signup' ? 'Create account' : 'Log in'}
      </Button>

      <p className="pt-1 text-center text-[13px] text-ink-muted">
        {mode === 'signup' ? (
          <>
            Already have an account?{' '}
            <Link href="/login" className="text-accent hover:underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            New to Lumen?{' '}
            <Link href="/signup" className="text-accent hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}
