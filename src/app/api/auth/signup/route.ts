import { NextResponse } from 'next/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { hashPassword, setAuthCookies } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
});

export async function POST(req: Request) {
  try {
    // Accounts require the database. Fail clearly rather than throwing a 500.
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Accounts are not available yet — the database is not configured. You can still explore PathFinder without an account.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const db = createAdminClient();

    // Check if user exists
    const { data: existing } = await db
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const { data: user, error } = await db
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role: 'student',
      })
      .select('id, email, role')
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Create empty profile
    await db.from('profiles').insert({
      user_id: user.id,
      career_preferences: {},
      user_phase: 'new',
    });

    // Set auth cookies
    await setAuthCookies({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (e) {
    logger.error('Signup failed', { error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
