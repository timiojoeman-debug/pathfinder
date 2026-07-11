import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getServerDb, isSupabaseConfigured } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

/**
 * GDPR data export — returns everything we hold for the signed-in user as a
 * single JSON document. The client offers it as a download. Local-first:
 * without a database there is nothing server-side to export (all data lives in
 * the browser), so we say so rather than erroring.
 */

const USER_TABLES = [
  "profiles",
  "cvs",
  "applications",
  "networking_contacts",
  "coffee_chat_notes",
  "interview_stories",
  "leetcode_progress",
  "interview_logs",
  "ai_interactions",
  "career_events",
] as const;

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      note: "No server-side data — your PathFinder data is stored locally in this browser. Use your browser's export or the app's local backup.",
      user: { id: user.userId, email: user.email },
    });
  }

  try {
    const db = getServerDb()!;
    const out: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      user: { id: user.userId, email: user.email, role: user.role },
    };
    for (const table of USER_TABLES) {
      const { data } = await db.from(table).select("*").eq("user_id", user.userId);
      out[table] = data ?? [];
    }
    return new NextResponse(JSON.stringify(out, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="pathfinder-data-${user.userId}.json"`,
      },
    });
  } catch (e) {
    logger.error("Data export failed", { userId: user.userId, error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Export failed — please try again." }, { status: 500 });
  }
}
