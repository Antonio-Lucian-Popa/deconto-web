import { NextRequest, NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-url';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refreshToken')?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: 'No refresh token' }, { status: 401 });
  }

  const apiUrl = getApiBaseUrl();

  const res = await fetch(`${apiUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await res.json() as { accessToken?: string; refreshToken?: string; message?: string };

  if (!res.ok) {
    const response = NextResponse.json({ message: data.message ?? 'Refresh failed' }, { status: res.status });
    response.cookies.delete('refreshToken');
    return response;
  }

  const response = NextResponse.json({ accessToken: data.accessToken });

  response.cookies.set('refreshToken', data.refreshToken ?? '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
