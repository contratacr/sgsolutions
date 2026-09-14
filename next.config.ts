import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const configuracion: NextConfig = {
  images: { unoptimized: true },
  poweredByHeader: false,
  experimental: {serverActions: {bodySizeLimit: '32mb'}},
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
    ] }];
  }
};
export default createNextIntlPlugin('./src/i18n/request.ts')(configuracion);
