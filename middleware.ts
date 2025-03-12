import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextRequestWithAuth } from 'next-auth/middleware';

export async function middleware(request: NextRequestWithAuth) {
  const token = await getToken({ req: request });
  const pathname = request.nextUrl.pathname;
  
  // Helper function to check if path starts with any of the given prefixes
  const pathStartsWith = (prefixes: string[]) => 
    prefixes.some(prefix => pathname.startsWith(prefix));

  // Define auth pages
  const authPaths = ['/auth', '/auth/signin', '/auth/signup', '/auth/sign'];
  const isAuthPage = pathStartsWith(authPaths);
  
  // Define dashboard paths
  const employerPaths = ['/employer', '/employer/dash', '/employer/dashboard'];
  const employeePaths = ['/freelancer', '/freelancer/dash', '/freelancer/dashboard'];
  
  // Define API paths
  const isApiPage = pathname.startsWith('/api');

  // Allow API routes to pass through
  if (isApiPage) {
    return NextResponse.next();
  }

  // Handle root path
  if (pathname === '/') {
    if (token) {
      return NextResponse.redirect(new URL(
        token.userType === 'employer' ? '/employer/dashboard' : '/freelancer/dashboard',
        request.url
      ));
    }
    return NextResponse.redirect(new URL('/auth/signup', request.url));
  }

  // If user is authenticated
  if (token) {
    // Don't allow authenticated users to access auth pages
    if (isAuthPage) {
      return NextResponse.redirect(new URL(
        token.userType === 'employer' ? '/employer/dashboard' : '/freelancer/dashboard',
        request.url
      ));
    }

    // Handle employer paths
    if (token.userType === 'employer') {
      if (pathStartsWith(employeePaths)) {
        return NextResponse.redirect(new URL('/employer/dashboard', request.url));
      }
      if (pathname === '/employer' || pathname === '/employer/dash') {
        return NextResponse.redirect(new URL('/employer/dashboard', request.url));
      }
      if (pathname === '/employer/dashboard') {
        return NextResponse.next();
      }
    }

    // Handle freelancer paths
    if (token.userType === 'freelancer') {
      if (pathStartsWith(employerPaths)) {
        return NextResponse.redirect(new URL('/freelancer/dashboard', request.url));
      }
      if (pathname === '/freelancer' || pathname === '/freelancer/dash') {
        return NextResponse.redirect(new URL('/freelancer/dashboard', request.url));
      }
      if (pathname === '/freelancer/dashboard') {
        return NextResponse.next();
      }
    }

    // Redirect to appropriate dashboard for any other paths
    return NextResponse.redirect(new URL(
      token.userType === 'employer' ? '/employer/dashboard' : '/freelancer/dashboard',
      request.url
    ));
  }

  // If user is not authenticated
  if (!token) {
    // Handle auth pages
    if (pathname === '/auth/signin' || pathname === '/auth/signup') {
      return NextResponse.next();
    }
    // Redirect all other auth paths to signup
    if (isAuthPage) {
      return NextResponse.redirect(new URL('/auth/signup', request.url));
    }
    // Redirect any other path to signup
    return NextResponse.redirect(new URL('/auth/signup', request.url));
  }
}

// Configure protected routes
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /static (static files)
     * 4. /favicon.ico, /sitemap.xml (static files)
     */
    '/((?!api|_next|static|favicon.ico|sitemap.xml).*)',
  ],
}; 