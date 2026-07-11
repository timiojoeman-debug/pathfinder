import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';
import { verifyPassword, setAuthCookies } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const db = createAdminClient();

    const { data: user } = await db
      .from('users')
      .select('id, email, password_hash, role')
      .eq('email', email.toLowerCase())
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    await setAuthCookies({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (e) {
    console.error('Login error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
