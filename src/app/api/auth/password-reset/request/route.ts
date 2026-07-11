import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { generateToken, hashToken, TOKEN_TTL_MS } from "@/lib/tokens";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

/** Begin a password reset. Always returns ok — never reveals whether an
 *  address is registered (prevents account enumeration). */
const Body = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();

  try {
    const db = createAdminClient();
    const { data: user } = await db.from("users").select("id").eq("email", email).single();
    if (user) {
      const token = generateToken();
      await db.from("password_reset_tokens").insert({
        user_id: user.id,
        token_hash: await hashToken(token),
        expires_at: new Date(Date.now() + TOKEN_TTL_MS.passwordReset).toISOString(),
      });
      await sendEmail({ to: email, ...passwordResetEmail(token) });
    }
  } catch (e) {
    logger.error("password-reset request failed", { error: e instanceof Error ? e.message : String(e) });
  }
  return NextResponse.json({ ok: true });
}
