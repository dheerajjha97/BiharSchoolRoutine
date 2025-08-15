
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // List of public paths that don't require authentication
  const publicPaths = ['/login', '/manifest.json', '/favicon.ico', '/icons/'];

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // To check for authentication, we'd ideally check a token.
  // In a client-side auth model like Firebase, the client handles redirects.
  // This middleware is a server-side guard. For Firebase, the true guard
  // is in the AppStateProvider which redirects if there's no user.
  // However, we can add a simple cookie check as a first line of defense
  // or to handle direct server-side navigations.

  // Since Firebase sets its auth state client-side, a simple cookie might not
  // be the `firebase-auth-token`. We'll rely on the client-side check in
  // AppStateProvider, but this middleware structure is here if needed.

  // For now, it just lets requests through, relying on the client-side logic.
  // A more advanced setup might involve server-side rendering with session cookies.

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - .png, .jpg, .jpeg, .gif, .svg (image files)
     */
    '/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg)$).*)',
  ],
};
