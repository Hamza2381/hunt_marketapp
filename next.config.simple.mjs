/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable TypeScript errors
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable image optimization
  images: {
    unoptimized: true,
  },
  // Fix Supabase critical dependency warning
  transpilePackages: ['@supabase/supabase-js', '@supabase/realtime-js', '@supabase/auth-helpers-nextjs'],
  webpack: (config) => {
    config.module = config.module || {};
    config.module.exprContextCritical = false;
    return config;
  },
  // Enable experimental features
  experimental: {
    scrollRestoration: true,
  },
}

export default nextConfig
