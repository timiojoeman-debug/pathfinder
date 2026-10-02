import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { AI_DAILY_QUOTA, ANON_AI_DAILY_QUOTA, classifyRoute, hit, hitDaily, isGuestAllowed, LIMITS } from '@/lib/rate-limit';

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
  // Pilot enquiries from /universities. The people this page is for do not
  // have accounts; requiring one to say "we're interested" is the conversion
  // path failing in a different way. Writes one row, calls no model, and
  // carries its own per-IP daily cap on top of the strict per-minute bucket.
  '/api/pilot-interest',
  // Vercel Cron has no session cookie. The route checks CRON_SECRET itself and
  // answers 401 without it (including when the secret is unset).
  '/api/cron/refresh-jobs',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(route => pathname === route);
}

/**
 * Forward a request for which no session was verified (public or guest path).
 * The identity headers are set only after a valid token, and downstream code
 * (api-helpers, the AI cost log) trusts them — so a client-supplied copy must
 * never survive.
 */
function nextWithoutIdentity(request: NextRequest) {
  const headers = new Headers(request.headers);
  for (const h of ['x-user-id', 'x-user-email', 'x-user-role']) headers.delete(h);
  return NextResponse.next({ request: { headers } });
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
  const rl = await hit(`${clientIp(request)}:${bucket}`, limit, windowMs);
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
    return nextWithoutIdentity(request);
  }

  const token = request.cookies.get('pathfinder-token')?.value;

  // A valid session gets full access with the per-user daily AI quota. A missing
  // or expired token falls through to guest handling rather than a hard 401, so
  // a lapsed cookie still degrades to the logged-out experience on open routes.
  if (token) {
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
        const quota = await hitDaily(`aiq:${userId}`, AI_DAILY_QUOTA);
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
      // Invalid/expired token — treat as logged-out below, not a 401 outright.
    }
  }

  // No valid session. Guest-safe routes (e.g. job search — no user data, just
  // GitHub + Adzuna) run anonymously, metered by a per-IP daily budget so they
  // cannot run up the provider quota. Everything else still requires sign-in.
  if (isGuestAllowed(pathname)) {
    if (bucket === 'ai') {
      const quota = await hitDaily(`aiq:anon:${clientIp(request)}`, ANON_AI_DAILY_QUOTA);
      if (!quota.ok) {
        return NextResponse.json(
          { error: `You've reached today's free limit (${ANON_AI_DAILY_QUOTA} searches). Sign in for more, or try again after midnight UTC.` },
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
    return nextWithoutIdentity(request);
  }

  return NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 }
  );
}

export const config = {
  matcher: '/api/:path*',
};
