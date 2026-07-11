import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Career Profile persistence. The client posts its derived profile snapshot +
 * recent events here; we upsert the fast read-model onto `profiles` and append
 * new events to `career_events`. Local-first by design: if Supabase isn't
 * configured the client keeps working from localStorage and this returns
 * `{ persisted: false }` rather than erroring.
 *
 * GET returns the stored snapshot so a returning user's profile survives across
 * devices.
 */

interface SnapshotBody {
  directionStatement?: string | null;
  directionScore?: number | null;
  userPhase?: string;
  progressSnapshot?: Record<string, unknown>;
  strengths?: string[];
  weaknesses?: string[];
  cvHistory?: number[];
  events?: { type: string; phase: string; label: string; meta?: Record<string, unknown>; ts: number }[];
  /** The full client working-state slice (localStorage cache) for cross-device restore. */
  clientState?: Record<string, unknown>;
}

const VALID_PHASES = ["new", "direction_set", "cv_uploaded", "cv_analyzed", "applying", "networking", "interviewing"];

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  let body: SnapshotBody;
  try {
    body = (await req.json()) as SnapshotBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // No Supabase configured → local-first, report cleanly.
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ persisted: false, reason: "storage-not-configured" });
  }

  try {
    const db = createAdminClient();
    const phase = body.userPhase && VALID_PHASES.includes(body.userPhase) ? body.userPhase : "new";

    await db.from("profiles").upsert(
      {
        user_id: user.userId,
        direction_statement: body.directionStatement ?? null,
        direction_score: body.directionScore ?? null,
        user_phase: phase,
        progress_snapshot: body.progressSnapshot ?? {},
        strengths: body.strengths ?? [],
        weaknesses: body.weaknesses ?? [],
        cv_analysis_history: body.cvHistory ?? [],
        client_state: body.clientState ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    // Append only genuinely new events (client sends its full recent tail; we
    // dedupe by (label, ts) to keep the stream idempotent under retries).
    const events = Array.isArray(body.events) ? body.events.slice(-50) : [];
    if (events.length) {
      const { data: existing } = await db
        .from("career_events")
        .select("label, created_at")
        .eq("user_id", user.userId)
        .order("created_at", { ascending: false })
        .limit(100);
      const seen = new Set((existing ?? []).map((e) => `${e.label}`));
      const fresh = events
        .filter((e) => !seen.has(e.label))
        .map((e) => ({
          user_id: user.userId,
          event_type: e.type,
          phase: e.phase,
          label: e.label,
          meta: e.meta ?? {},
          created_at: new Date(e.ts).toISOString(),
        }));
      if (fresh.length) await db.from("career_events").insert(fresh);
    }

    return NextResponse.json({ persisted: true });
  } catch (err) {
    // Never break the app over a sync failure — the client is the source of truth.
    return NextResponse.json({ persisted: false, reason: err instanceof Error ? err.message : "sync-failed" });
  }
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ profile: null, clientState: null, reason: "storage-not-configured" });
  }

  try {
    const db = createAdminClient();
    const { data: profile } = await db
      .from("profiles")
      .select("direction_statement, direction_score, user_phase, progress_snapshot, strengths, weaknesses, cv_analysis_history, client_state")
      .eq("user_id", user.userId)
      .single();
    const { data: events } = await db
      .from("career_events")
      .select("event_type, phase, label, meta, created_at")
      .eq("user_id", user.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    const clientState = (profile?.client_state && Object.keys(profile.client_state).length) ? profile.client_state : null;
    return NextResponse.json({ profile: profile ?? null, clientState, events: events ?? [] });
  } catch {
    return NextResponse.json({ profile: null, clientState: null, reason: "read-failed" });
  }
}
