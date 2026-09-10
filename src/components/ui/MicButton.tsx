'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from './cn';
import {
  AUTO_DETECT,
  DEFAULT_LANGUAGE,
  LANGUAGES,
  normaliseLanguage,
  speechTag,
} from '@/lib/languages';

type State = 'idle' | 'recording' | 'transcribing';

const STORAGE_KEY = 'lumen.voice.language';

/**
 * Voice input, live where the browser can do it.
 *
 * Chrome and Safari expose a recogniser that returns words while you are still
 * speaking, so that is the path taken: the text lands in the box as it is
 * said, and the box is focused the moment recording starts. That recognition
 * runs through the browser vendor rather than through Lumen.
 *
 * Where it is missing — Firefox, older engines — the clip is recorded and sent
 * to /api/voice/transcribe when you stop, which is slower but works everywhere.
 * Either way Lumen never stores the audio.
 */

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  0: RecognitionAlternative;
  isFinal: boolean;
  length: number;
}
interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [index: number]: RecognitionResult };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionConstructor = new () => Recognition;

function recognitionCtor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function MicButton({
  onTranscript,
  onSessionStart,
  className,
}: {
  /** The whole transcript for the current recording, replacing the last one. */
  onTranscript: (text: string) => void;
  /** Fired the moment recording starts, before any text exists. */
  onSessionStart?: () => void;
  className?: string;
}) {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [live, setLive] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recognitionRef = useRef<Recognition | null>(null);
  const finalRef = useRef('');
  const languageRef = useRef(DEFAULT_LANGUAGE);
  languageRef.current = language;

  useEffect(() => {
    setLive(recognitionCtor() !== null);
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved !== null) setLanguage(normaliseLanguage(saved));
    } catch {
      // Private mode, or storage blocked. English it is.
    }
  }, []);

  // A recogniser left running holds the microphone open after the component
  // goes away.
  useEffect(() => () => recognitionRef.current?.abort(), []);

  function chooseLanguage(value: string) {
    setLanguage(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Not remembering the choice is survivable; failing to record is not.
    }
  }

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recorderRef.current?.stop();
  }, []);

  /** Live path: words arrive while the person is still talking. */
  const startLive = useCallback(
    (Ctor: RecognitionConstructor) => {
      const recognition = new Ctor();
      recognition.lang = speechTag(languageRef.current, navigator.language);
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      finalRef.current = '';

      recognition.onresult = (event) => {
        let interim = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const text = result[0]?.transcript ?? '';
          if (result.isFinal) finalRef.current = `${finalRef.current}${text}`;
          else interim += text;
        }
        onTranscript(`${finalRef.current}${interim}`.trim());
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech') return;
        setError(
          event.error === 'not-allowed'
            ? 'Microphone blocked — allow it in your browser'
            : 'Could not hear that',
        );
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        setState('idle');
      };

      recognition.start();
      recognitionRef.current = recognition;
      setState('recording');
      onSessionStart?.();
    },
    [onSessionStart, onTranscript],
  );

  /** Fallback path: record, then transcribe on the server when stopped. */
  const startRecorded = useCallback(async () => {
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
        form.append('language', languageRef.current);
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
    onSessionStart?.();
  }, [onSessionStart, onTranscript]);

  const start = useCallback(async () => {
    setError(null);
    const Ctor = recognitionCtor();
    try {
      if (Ctor) startLive(Ctor);
      else await startRecorded();
    } catch {
      setError('Microphone unavailable');
      setState('idle');
    }
  }, [startLive, startRecorded]);

  return (
    <span className="relative inline-flex items-center gap-1">
      <label className="sr-only" htmlFor="voice-language">
        Language you will speak
      </label>
      <select
        id="voice-language"
        value={language}
        onChange={(event) => chooseLanguage(event.target.value)}
        disabled={state !== 'idle'}
        title="Language you will speak"
        className="h-9 max-w-[92px] shrink-0 truncate rounded-pill border border-hairline bg-raised px-2 text-[11.5px] text-ink-muted outline-none transition hover:text-ink-primary focus:border-accent/40 disabled:opacity-40"
      >
        {LANGUAGES.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
        <option value={AUTO_DETECT}>Detect it</option>
      </select>
      <button
        type="button"
        title={
          error ??
          (state === 'recording'
            ? 'Stop'
            : live
              ? 'Speak — the words appear as you say them'
              : 'Record, then Lumen writes it down')
        }
        aria-label={state === 'recording' ? 'Stop recording' : 'Start voice input'}
        onClick={state === 'recording' ? stop : start}
        disabled={state === 'transcribing'}
        className={cn(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border transition',
          state === 'recording'
            ? 'animate-pulse-dot border-accent bg-accent-soft text-accent'
            : 'border-hairline text-ink-muted hover:text-ink-primary',
          className,
        )}
      >
        {state === 'transcribing' ? (
          <span className="h-2 w-2 animate-pulse-dot rounded-pill bg-accent" />
        ) : (
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
            <rect x="7" y="2" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
      {state === 'recording' ? (
        <span className="pointer-events-none absolute -top-7 right-0 whitespace-nowrap rounded-md border border-accent/30 bg-accent-soft px-2 py-1 text-[11px] text-accent">
          {live ? 'Listening…' : 'Recording…'}
        </span>
      ) : null}
      {error ? (
        <span className="absolute -top-8 right-0 whitespace-nowrap rounded-md border border-hairline bg-raised px-2 py-1 text-[11px] text-ink-secondary">
          {error}
        </span>
      ) : null}
    </span>
  );
}
