import { NextResponse } from "next/server";
import { getAuthUser, clearAuthCookies } from "@/lib/auth";
import { getServerDb, isSupabaseConfigured } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { z } from "zod";

/**
 * GDPR account deletion — permanently removes the user and, via the schema's
 * `on delete cascade` foreign keys, every row that belongs to them. Requires an
 * explicit typed confirmation to avoid accidental loss. Signs the user out
 * afterwards. Local-first: with no database there is no server account to
 * delete, so the client just clears its localStorage.
 */

const Confirm = z.object({ confirm: z.literal("DELETE") });

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const parsed = Confirm.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Confirmation required: send { "confirm": "DELETE" }.' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    await clearAuthCookies();
    return NextResponse.json({ deleted: false, reason: "no-server-account", note: "No server account existed. Clear this browser's data to remove your local PathFinder data." });
  }

  try {
    const db = getServerDb()!;
    // Cascade FKs remove profiles, cvs, applications, contacts, events, etc.
    const { error } = await db.from("users").delete().eq("id", user.userId);
    if (error) {
      logger.error("Account deletion failed", { userId: user.userId, error: error.message });
      return NextResponse.json({ error: "Deletion failed — please try again." }, { status: 500 });
    }
    await clearAuthCookies();
    logger.info("Account deleted", { userId: user.userId });
    return NextResponse.json({ deleted: true });
  } catch (e) {
    logger.error("Account deletion threw", { userId: user.userId, error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Deletion failed — please try again." }, { status: 500 });
  }
}
