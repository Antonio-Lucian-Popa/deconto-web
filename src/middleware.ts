import { NextRequest, NextResponse } from 'next/server';

const publicPaths = ['/login', '/api/auth'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const refreshToken = req.cookies.get('refreshToken')?.value;

  if (!refreshToken && !pathname.startsWith('/api')) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\..*).*)'],
};
