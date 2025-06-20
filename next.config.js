/** @type {import('next').NextConfig} */
const nextConfig = {
  // Completely disable TypeScript checking
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint checking
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable image optimization
  images: {
    unoptimized: true,
  },
  // Fix Supabase critical dependency warning
  transpilePackages: ['@supabase/supabase-js', '@supabase/realtime-js', '@supabase/auth-helpers-nextjs'],
  // Configure webpack to ignore critical dependency warnings
  webpack: (config) => {
    config.module = config.module || {};
    config.module.exprContextCritical = false;
    return config;
  },
  // Enable experimental features
  experimental: {
    scrollRestoration: true,
  },
  // Force no caching for API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ]
  },
  // Environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
}

module.exports = nextConfig
