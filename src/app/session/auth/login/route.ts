import { NextRequest, NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-url';

export async function POST(req: NextRequest) {
  const body = await req.json() as { email: string; password: string };
  const apiUrl = getApiBaseUrl();

  const res = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json() as { accessToken?: string; refreshToken?: string; user?: unknown; message?: string };

  if (!res.ok) {
    return NextResponse.json({ message: data.message ?? 'Login failed' }, { status: res.status });
  }

  const response = NextResponse.json({ accessToken: data.accessToken, user: data.user });

  response.cookies.set('refreshToken', data.refreshToken ?? '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
