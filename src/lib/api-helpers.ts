import { NextResponse } from 'next/server';
import type { TokenPayload } from '@/lib/auth';

export function getRequestUser(req: Request): TokenPayload {
  const headers = req.headers;
  return {
    userId: headers.get('x-user-id')!,
    email: headers.get('x-user-email')!,
    role: headers.get('x-user-role')!,
  };
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
