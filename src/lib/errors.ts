import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Writing down what went wrong.
 *
 * This project is full of catch blocks that keep something working when a part
 * of it fails — a site still serves when its counter is missing, a build still
 * runs when a progress write is lost. That is the right trade every time, and
 * it has one cost: the reason disappears. A build looped for two hours and
 * neither the person watching it nor anyone reading the code afterwards could
 * say why.
 *
 * So the trade becomes: keep working, and say what happened.
 *
 * Nothing here is allowed to throw. A logger that can break the thing it is
 * reporting on is worse than no logger.
 */

export interface ErrorNote {
  /** Where, as a short dotted name: 'generation.step', 'lead.insert'. */
  scope: string;
  error: unknown;
  userId?: string | null;
  projectId?: string | null;
  /** Anything that helps. Never a request body, a key, or an address. */
  detail?: Record<string, unknown>;
}

/** The message, however the failure was thrown. */
export function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error)?.slice(0, 500) ?? 'Unknown error';
  } catch {
    return 'Unknown error';
  }
}

/**
 * Keys and tokens end up in messages more often than anyone expects — an
 * upstream library prints the request it made, and the request had a header.
 */
export function redact(value: string): string {
  return value
    .replace(/\b(sk|rk|pk|sb|whsec|rzp)[-_][A-Za-z0-9_-]{8,}/g, '[redacted]')
    .replace(/\bBearer\s+[A-Za-z0-9._-]{8,}/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9._-]{20,}/g, '[redacted-token]');
}

export async function logError(note: ErrorNote): Promise<void> {
  const message = redact(messageOf(note.error)).slice(0, 2000);

  // Always to the server log, whether or not the table is there. This is the
  // line that shows up in the hosting dashboard when the database is the thing
  // that is broken.
  console.error(`[lumen:${note.scope}] ${message}`, note.detail ?? {});

  try {
    await createAdminClient()
      .from('error_events')
      .insert({
        user_id: note.userId ?? null,
        project_id: note.projectId ?? null,
        scope: note.scope.slice(0, 80),
        message,
        detail: (note.detail ?? null) as never,
      });
  } catch {
    // The table arrives in migration 0014, and a database that has not run it
    // should not turn a logged failure into a thrown one.
  }
}

/** Fire-and-forget, for the many places that cannot wait on a write. */
export function noteError(note: ErrorNote): void {
  void logError(note);
}
