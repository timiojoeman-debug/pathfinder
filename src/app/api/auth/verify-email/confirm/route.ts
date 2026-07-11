import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { hashToken } from "@/lib/tokens";
import { logger } from "@/lib/logger";

/** Confirm an email-verification token: marks the user verified, single-use. */
const Body = z.object({ token: z.string().min(10) });

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ verified: false, error: "Verification is unavailable." }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ verified: false, error: "Invalid or missing token." }, { status: 400 });

  try {
    const db = createAdminClient();
    const tokenHash = await hashToken(parsed.data.token);
    const { data: row } = await db
      .from("email_verification_tokens")
      .select("id, user_id, expires_at, used")
      .eq("token_hash", tokenHash)
      .single();

    if (!row || row.used || new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ verified: false, error: "This link is invalid or has expired." }, { status: 400 });
    }

    await db.from("users").update({ email_verified: true }).eq("id", row.user_id);
    await db.from("email_verification_tokens").update({ used: true }).eq("id", row.id);
    return NextResponse.json({ verified: true });
  } catch (e) {
    logger.error("verify-email confirm failed", { error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ verified: false, error: "Verification failed — please try again." }, { status: 500 });
  }
}
