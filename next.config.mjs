/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * SECURITY NOTE: We use server actions for all mutations.
   * This ensures that permission checks happen server-side,
   * where they cannot be bypassed by malicious clients.
   */
  experimental: {
    // Server actions are stable in Next.js 14, but we enable
    // the body size limit for large message payloads
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  /**
   * EXTENSION POINT: Image optimization
   * If you add profile pictures later, configure Supabase storage domain here:
   * images: { remotePatterns: [{ hostname: 'your-project.supabase.co' }] }
   */
}

export default nextConfig

