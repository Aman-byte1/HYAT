import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('hyat_auth');
  const { pathname } = request.nextUrl;

  // If trying to access dashboard without auth, redirect to login
  if (pathname === '/' && !authCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If trying to access login while already authenticated, redirect to dashboard
  if (pathname === '/login' && authCookie) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login'],
};
