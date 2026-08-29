'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES } from '@/lib/categories';

export function AccountForm({
  email,
  fullName,
  businessType,
  voiceStorageEnabled,
}: {
  email: string;
  fullName: string;
  businessType: string;
  voiceStorageEnabled: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [category, setCategory] = useState(businessType);
  const [voiceStorage, setVoiceStorage] = useState(voiceStorageEnabled);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in first');

      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: name,
          onboarding_business_type: category || null,
          voice_storage_enabled: voiceStorage,
        })
        .eq('id', user.id);
      if (updateError) throw updateError;

      if (password) {
        const { error: passwordError } = await supabase.auth.updateUser({ password });
        if (passwordError) throw passwordError;
        setPassword('');
      }

      setNotice('Saved.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save that');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Field label="Email">
        <Input value={email} readOnly disabled />
      </Field>

      <Field label="Your name">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Priya Sharma" />
      </Field>

      <Field label="What you build sites for" hint="Pre-fills your prompts. Change it any time.">
        <Select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Not set</option>
          {CATEGORIES.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="New password" hint="Leave blank to keep your current one.">
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          minLength={8}
        />
      </Field>

      <label className="flex items-start gap-3 rounded-[10px] border border-hairline bg-raised px-4 py-3">
        <input
          type="checkbox"
          checked={voiceStorage}
          onChange={(event) => setVoiceStorage(event.target.checked)}
          className="mt-0.5 accent-[var(--accent)]"
        />
        <span className="text-[13px] text-ink-secondary">
          Keep voice transcripts with my projects.
          <span className="mt-0.5 block text-[12px] text-ink-muted">
            Audio is never stored either way — it is streamed to the transcription model and discarded. This
            only controls whether the resulting text is kept in your chat history.
          </span>
        </span>
      </label>

      <Button onClick={saveProfile} disabled={busy}>
        {busy ? 'Saving…' : 'Save changes'}
      </Button>

      {error ? <p className="text-[13px] text-[#e5735a]">{error}</p> : null}
      {notice ? <p className="text-[13px] text-accent">{notice}</p> : null}
    </div>
  );
}
