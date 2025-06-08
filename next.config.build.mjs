/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable all TypeScript checking
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: false, // Skip loading tsconfig
  },
  // Disable all ESLint checking
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable image optimization
  images: {
    unoptimized: true,
  },
  // Transpile @supabase packages to fix the critical dependency warning
  transpilePackages: ['@supabase/supabase-js', '@supabase/realtime-js', '@supabase/auth-helpers-nextjs'],
  // Configure Next.js for smoother navigation
  experimental: {
    scrollRestoration: true,
    // Skip type checking
    skipTypeChecking: true,
    // Skip middleware type checking
    skipMiddlewareUrlNormalize: true,
    // Skip trailing slash normalization
    skipTrailingSlashRedirect: true,
  },
  // Environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SKIP_TYPE_CHECK: 'true',
  },
  // Configure webpack
  webpack: (config, { dev, isServer }) => {
    // Set watch options for development
    config.watchOptions = {
      poll: false,
      ignored: ['**/node_modules', '**/.git']  
    };
    
    // Fix for critical dependency warning in Supabase
    config.module = config.module || {};
    config.module.exprContextCritical = false;
    
    // Disable Fast Refresh in development (if needed)
    if (dev) {
      // Disable Fast Refresh
      if (config.devServer) {
        config.devServer = {
          ...config.devServer,
          hot: false,
        };
      }
      
      if (!isServer) {
        // Disable refresh on client-side navigation
        const originalEntry = config.entry;
        config.entry = async () => {
          const entries = await originalEntry();
          if (entries && entries['main.js']) {
            entries['main.js'] = entries['main.js'].filter(
              (entry) => !entry.includes('webpack-hot-middleware')
            );
          }
          return entries;
        };
      }
    }
    
    return config;
  },
}

export default nextConfig
