import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Clone the response
  const response = NextResponse.next();

  // Only apply aggressive caching to static assets, not dynamic pages
  if (request.nextUrl.pathname.startsWith('/_next/static') || 
      request.nextUrl.pathname.startsWith('/_next/image') ||
      request.nextUrl.pathname.endsWith('.ico') ||
      request.nextUrl.pathname.endsWith('.png') ||
      request.nextUrl.pathname.endsWith('.jpg') ||
      request.nextUrl.pathname.endsWith('.jpeg') ||
      request.nextUrl.pathname.endsWith('.svg')) {
    // Cache static assets aggressively
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    // For dynamic pages, allow fresh data loading while maintaining some caching for performance
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  }
  
  response.headers.set('X-Content-Type-Options', 'nosniff');

  return response;
}

// Only apply to navigation paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
