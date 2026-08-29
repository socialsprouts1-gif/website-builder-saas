'use client';

import { useCallback, useRef, useState } from 'react';
import { cn } from './cn';

type State = 'idle' | 'recording' | 'transcribing';

/**
 * Records a short clip and posts it to /api/voice/transcribe.
 * Audio is never persisted — the route streams the blob straight to the
 * transcription model and returns text only (Section 8, privacy).
 */
export function MicButton({
  onTranscript,
  className,
}: {
  onTranscript: (text: string) => void;
  className?: string;
}) {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setState('transcribing');
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const form = new FormData();
          form.append('audio', blob, 'clip.webm');
          const response = await fetch('/api/voice/transcribe', { method: 'POST', body: form });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error ?? 'Transcription failed');
          if (payload.text) onTranscript(String(payload.text).trim());
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Transcription failed');
        } finally {
          setState('idle');
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setState('recording');
    } catch {
      setError('Microphone unavailable');
      setState('idle');
    }
  }, [onTranscript]);

  return (
    <span className="relative">
      <button
        type="button"
        title={error ?? (state === 'recording' ? 'Stop and transcribe' : 'Speak your prompt')}
        aria-label={state === 'recording' ? 'Stop recording' : 'Start voice input'}
        onClick={state === 'recording' ? stop : start}
        disabled={state === 'transcribing'}
        className={cn(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border transition',
          state === 'recording'
            ? 'border-accent bg-accent-soft text-accent animate-pulse-dot'
            : 'border-hairline text-ink-muted hover:text-ink-primary',
          className,
        )}
      >
        {state === 'transcribing' ? (
          <span className="h-2 w-2 rounded-pill bg-accent animate-pulse-dot" />
        ) : (
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
            <rect x="7" y="2" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.4" />
            <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        )}
      </button>
      {error ? (
        <span className="absolute -top-8 right-0 whitespace-nowrap rounded-md border border-hairline bg-raised px-2 py-1 text-[11px] text-ink-secondary">
          {error}
        </span>
      ) : null}
    </span>
  );
}
