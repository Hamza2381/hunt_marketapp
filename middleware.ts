import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add aggressive no-cache headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Allow all origins in development, restrict in production
    const origin = request.headers.get('origin')
    const allowedOrigins = [
      'http://localhost:3000',
      'https://your-vercel-domain.vercel.app' // Replace with your actual domain
    ]
    
    if (!origin || allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin || '*')
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    
    // Aggressive no-cache headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('CDN-Cache-Control', 'no-cache')
    response.headers.set('Vercel-CDN-Cache-Control', 'no-cache')
    response.headers.set('Surrogate-Control', 'no-cache')
    response.headers.set('X-Accel-Expires', '0')
    
    return response
  }
  
  // Handle static assets with aggressive caching
  if (request.nextUrl.pathname.startsWith('/_next/static') || 
      request.nextUrl.pathname.startsWith('/_next/image') ||
      request.nextUrl.pathname.endsWith('.ico') ||
      request.nextUrl.pathname.endsWith('.png') ||
      request.nextUrl.pathname.endsWith('.jpg') ||
      request.nextUrl.pathname.endsWith('.jpeg') ||
      request.nextUrl.pathname.endsWith('.svg')) {
    // Cache static assets aggressively
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  } else {
    // For dynamic pages, prevent caching to ensure fresh data
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  }
  
  response.headers.set('X-Content-Type-Options', 'nosniff')

  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
