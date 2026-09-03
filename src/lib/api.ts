import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { SchemaNotInstalledError, SupabaseNotConfiguredError } from '@/lib/supabase/errors';

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function fromZodError(error: ZodError) {
  return jsonError(error.issues[0]?.message ?? 'Invalid request', 422);
}

/** Turns anything thrown in a route handler into a safe, useful response. */
export function handleRouteError(cause: unknown) {
  if (cause instanceof ZodError) return fromZodError(cause);
  // Unconfigured deployment, not a bug: 503 says "come back once it is set up".
  if (cause instanceof SupabaseNotConfiguredError) return jsonError(cause.message, 503);
  if (cause instanceof SchemaNotInstalledError) return jsonError(cause.message, 503);
  const message = cause instanceof Error ? cause.message : 'Something went wrong';
  // Never leak stack traces or provider internals to the client.
  return jsonError(message.slice(0, 400), 500);
}

/** Server-Sent Events envelope shared by the generation and chat streams. */
export function sseHeaders(): HeadersInit {
  return {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  };
}

export function sseEncode(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}
