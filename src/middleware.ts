import { NextRequest, NextResponse } from 'next/server';

const publicPaths = ['/login', '/api/auth'];
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/+$/, '') || '';

function withoutBasePath(pathname: string) {
  if (!basePath || pathname === basePath) return pathname;
  return pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : pathname;
}

export function middleware(req: NextRequest) {
  const pathname = withoutBasePath(req.nextUrl.pathname);

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const refreshToken = req.cookies.get('refreshToken')?.value;

  if (!refreshToken && !pathname.startsWith('/api')) {
    const loginUrl = new URL(`${basePath}/login`, req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\..*).*)'],
};
