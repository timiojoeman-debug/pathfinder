import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { hashPassword } from "@/lib/auth";
import { hashToken } from "@/lib/tokens";
import { logger } from "@/lib/logger";

/** Complete a password reset with a valid single-use token. */
const Body = z.object({ token: z.string().min(10), password: z.string().min(8, "Password must be at least 8 characters") });

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Password reset is unavailable." }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  try {
    const db = createAdminClient();
    const tokenHash = await hashToken(parsed.data.token);
    const { data: row } = await db
      .from("password_reset_tokens")
      .select("id, user_id, expires_at, used")
      .eq("token_hash", tokenHash)
      .single();

    if (!row || row.used || new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await db.from("users").update({ password_hash: passwordHash }).eq("id", row.user_id);
    // Burn this token and invalidate any other outstanding reset tokens.
    await db.from("password_reset_tokens").update({ used: true }).eq("user_id", row.user_id);
    logger.info("password reset completed", { userId: row.user_id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("password-reset confirm failed", { error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Reset failed — please try again." }, { status: 500 });
  }
}
