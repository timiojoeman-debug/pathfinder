import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { generateToken, hashToken, TOKEN_TTL_MS } from "@/lib/tokens";
import { sendEmail, verificationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

/** Send (or resend) an email-verification link. Always returns ok — never
 *  reveals whether an address is registered. */
const Body = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();

  try {
    const db = createAdminClient();
    const { data: user } = await db.from("users").select("id, email_verified").eq("email", email).single();
    if (user && !user.email_verified) {
      const token = generateToken();
      await db.from("email_verification_tokens").insert({
        user_id: user.id,
        token_hash: await hashToken(token),
        expires_at: new Date(Date.now() + TOKEN_TTL_MS.verifyEmail).toISOString(),
      });
      await sendEmail({ to: email, ...verificationEmail(token) });
    }
  } catch (e) {
    logger.error("verify-email request failed", { error: e instanceof Error ? e.message : String(e) });
  }
  return NextResponse.json({ ok: true });
}
