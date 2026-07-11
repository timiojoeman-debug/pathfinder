import { NextResponse } from 'next/server';

export async function GET() {
  const results = {
    openai: false,
    supabase: false,
    version: '0.1.0',
  };

  // Check OpenAI
  const openaiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${openaiKey}` },
      });
      results.openai = res.ok;
    } catch {
      results.openai = false;
    }
  }

  // Check Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
      });
      results.supabase = res.ok;
    } catch {
      results.supabase = false;
    }
  }

  return NextResponse.json(results);
}
