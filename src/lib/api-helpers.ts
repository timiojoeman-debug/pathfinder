import { NextResponse } from 'next/server';
import { getAuthUser, type TokenPayload } from '@/lib/auth';

export async function withAuth(
  handler: (user: TokenPayload, req: Request) => Promise<NextResponse>
): Promise<(req: Request) => Promise<NextResponse>> {
  return async (req: Request) => {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', retryable: false },
        { status: 401 }
      );
    }
    return handler(user, req);
  };
}

// Helper to get authenticated user or return null for optional auth
export async function getOptionalUser(): Promise<TokenPayload | null> {
  try {
    return await getAuthUser();
  } catch {
    return null;
  }
}

// Standard error response
export function errorResponse(message: string, status = 500, retryable = true) {
  return NextResponse.json({ error: message, retryable }, { status });
}

// Standard validation
export function validateRequired(body: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    if (!body[field] && body[field] !== 0 && body[field] !== false) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}
