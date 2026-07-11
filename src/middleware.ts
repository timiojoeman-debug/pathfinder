import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { AI_DAILY_QUOTA, classifyRoute, hit, hitDaily, LIMITS } from '@/lib/rate-limit';

const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  // Password reset + email verification are used by logged-out users. They are
  // rate-limited under the strict 'auth' bucket and never reveal account
  // existence.
  '/api/auth/password-reset/request',
  '/api/auth/password-reset/confirm',
  '/api/auth/verify-email/request',
  '/api/auth/verify-email/confirm',
  '/api/health',
  // Intel console is a logged-out surface; this route analyses request-body
  // text only (no user-specific server data).
  '/api/intel/analyze',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(route => pathname === route);
}

/** Best-effort client IP from the standard proxy headers. */
function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // ── Rate limiting (applies to every /api/* request, before auth) ──
  const bucket = classifyRoute(pathname);
  const { limit, windowMs } = LIMITS[bucket];
  const rl = hit(`${clientIp(request)}:${bucket}`, limit, windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests — slow down and try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rl.retryAfter),
          'RateLimit-Limit': String(rl.limit),
          'RateLimit-Remaining': String(rl.remaining),
        },
      },
    );
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('pathfinder-token')?.value;
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    const userId = payload.userId as string;

    // Per-user daily AI quota — caps OpenAI cost from any single account.
    if (bucket === 'ai') {
      const quota = hitDaily(`aiq:${userId}`, AI_DAILY_QUOTA);
      if (!quota.ok) {
        return NextResponse.json(
          { error: `You've reached today's AI limit (${AI_DAILY_QUOTA} requests). It resets at midnight UTC.` },
          {
            status: 429,
            headers: {
              'Retry-After': String(quota.retryAfter),
              'RateLimit-Limit': String(quota.limit),
              'RateLimit-Remaining': String(quota.remaining),
            },
          },
        );
      }
    }

    const headers = new Headers(request.headers);
    headers.set('x-user-id', userId);
    headers.set('x-user-email', payload.email as string);
    headers.set('x-user-role', payload.role as string);

    return NextResponse.next({ request: { headers } });
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: '/api/:path*',
};
