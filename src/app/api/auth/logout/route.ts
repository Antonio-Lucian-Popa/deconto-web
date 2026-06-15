import { NextRequest, NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-url';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refreshToken')?.value;
  const apiUrl = getApiBaseUrl();

  if (refreshToken) {
    await fetch(`${apiUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {/* best effort */});
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete('refreshToken');
  return response;
}
