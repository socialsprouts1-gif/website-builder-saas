import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normaliseWhatsApp } from '@/lib/whatsapp';
import { cleanServices } from '@/lib/booking';
import { handleRouteError, jsonError } from '@/lib/api';

export const runtime = 'nodejs';

const bodySchema = z.object({
  whatsappNumber: z.string().trim().max(30).nullable(),
  whatsappMessage: z.string().trim().max(600).nullable(),
  whatsappLeads: z.boolean(),
  bookingEnabled: z.boolean(),
  bookingServices: z.array(z.string().max(80)).max(20),
  bookingNote: z.string().trim().max(300).nullable(),
});

/** Turning WhatsApp and bookings on, which is two columns and no integration. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError('Sign in first', 401);

    // RLS scopes this to the caller, so a hit proves ownership.
    const { data: project } = await supabase.from('projects').select('id').eq('id', id).maybeSingle();
    if (!project) return jsonError('Project not found', 404);

    const body = bodySchema.parse(await request.json());

    // A number that cannot be dialled would become a button that opens a chat
    // with nobody, which is worse than no button.
    const number = body.whatsappNumber ? normaliseWhatsApp(body.whatsappNumber) : null;
    if (body.whatsappNumber && !number) {
      return jsonError('That does not look like a phone number. Include the country code.', 422);
    }

    const { error } = await createAdminClient()
      .from('projects')
      .update({
        whatsapp_number: number,
        whatsapp_message: body.whatsappMessage,
        whatsapp_leads: Boolean(number) && body.whatsappLeads,
        booking_enabled: body.bookingEnabled,
        booking_services: cleanServices(body.bookingServices),
        booking_note: body.bookingNote,
      })
      .eq('id', id);

    if (error) {
      return jsonError(
        'These settings need migration 0013. Run supabase/setup.sql and try again.',
        503,
      );
    }

    return NextResponse.json({ ok: true, whatsappNumber: number });
  } catch (cause) {
    return handleRouteError(cause);
  }
}
