import { NextResponse } from 'next/server';

export async function GET() {
  // Analytics computed client-side from Zustand store for now
  // When Supabase is connected, this will query the database
  return NextResponse.json({
    message: 'Dashboard analytics - computed client-side from local store',
  });
}
