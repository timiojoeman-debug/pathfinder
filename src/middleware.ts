import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/health',
  // Intel console is a logged-out surface; this route analyses request-body
  // text only (no user-specific server data). Rate-limit before production.
  '/api/intel/analyze',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(route => pathname === route);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/') || isPublicRoute(pathname)) {
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

    const headers = new Headers(request.headers);
    headers.set('x-user-id', payload.userId as string);
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
