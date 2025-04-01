import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextRequestWithAuth } from 'next-auth/middleware';

export async function middleware(request: NextRequestWithAuth) {
  const token = await getToken({ req: request });
  const pathname = request.nextUrl.pathname;

  const pathStartsWith = (prefixes: string[]) =>
    prefixes.some(prefix => pathname.startsWith(prefix));

  const authPaths = ['/auth', '/auth/signin', '/auth/signup', '/auth/sign'];
  const isAuthPage = pathStartsWith(authPaths);

  const employerPaths = ['/employer', '/employer/dash', '/employer/dashboard'];
  const freelancerPaths = ['/freelancer', '/freelancer/dash', '/freelancer/dashboard', '/freelancer/create-profile', '/freelancer/job-listings'];

  const isApiPage = pathname.startsWith('/api');

  if (isApiPage) {
    return NextResponse.next();
  }

  if (pathname === '/') {
    if (token) {
      return NextResponse.redirect(new URL(
        token.userType === 'employer' ? '/employer/dashboard' : '/freelancer/dashboard',
        request.url
      ));
    }
    return NextResponse.redirect(new URL('/auth/signup', request.url));
  }

  if (token) {
    if (isAuthPage) {
      return NextResponse.redirect(new URL(
        token.userType === 'employer' ? '/employer/dashboard' : '/freelancer/dashboard',
        request.url
      ));
    }

    if (token.userType === 'employer') {
      if (pathStartsWith(freelancerPaths)) {
        return NextResponse.redirect(new URL('/employer/dashboard', request.url));
      }
      if (
        pathname === '/employer' ||
        pathname === '/employer/dash'
      ) {
        return NextResponse.redirect(new URL('/employer/dashboard', request.url));
      }
      if (pathname === '/employer/dashboard') {
        return NextResponse.next();
      }
    }

    if (token.userType === 'freelancer') {
      if (pathStartsWith(employerPaths)) {
        return NextResponse.redirect(new URL('/freelancer/dashboard', request.url));
      }
      if (
        pathname === '/freelancer/dashboard' ||
        pathname === '/freelancer/create-profile' ||
        pathname === '/freelancer/job-listings'
      ) {
        return NextResponse.next();
      }
      if (
        pathname === '/freelancer' ||
        pathname === '/freelancer/dash'
      ) {
        return NextResponse.redirect(new URL('/freelancer/dashboard', request.url));
      }
    }

    const allowedPaths = [
      '/employer/dashboard',
      '/freelancer/dashboard',
      '/freelancer/create-profile'
    ];

    if (!allowedPaths.includes(pathname)) {
      return NextResponse.redirect(new URL(
        token.userType === 'employer' ? '/employer/dashboard' : '/freelancer/dashboard',
        request.url
      ));
    }
  }

  if (!token) {
    if (pathname === '/auth/signin' || pathname === '/auth/signup') {
      return NextResponse.next();
    }
    if (isAuthPage) {
      return NextResponse.redirect(new URL('/auth/signup', request.url));
    }
    return NextResponse.redirect(new URL('/auth/signup', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!api|_next|static|favicon.ico|sitemap.xml).*)',
  ],
};