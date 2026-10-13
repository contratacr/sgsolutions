import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const configuracion: NextConfig = {
  ...(process.env.SG_PRUEBAS_INTEGRACION === '1' && process.env.SG_ENTORNO === 'local' ? {distDir: '.next-pruebas'} : {}),
  images: { unoptimized: true },
  poweredByHeader: false,
  experimental: {serverActions: {bodySizeLimit: '32mb'}},
  async redirects() {
    return [
      {source:'/:path*',has:[{type:'host',value:'www.sgsolutionscr.com'}],destination:'https://sgsolutionscr.com/:path*',permanent:true},
      {source: '/finalizar-compra', destination: '/pagar', permanent: true},
      {source: '/finalizar-compra/resultado', destination: '/pago/resultado', permanent: true},
      {source: '/soluciones', destination: '/tienda', permanent: true},
      {source: '/soluciones/:path*', destination: '/tienda/:path*', permanent: true}
    ];
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
    ] }, {source:'/finalizar-compra/:path*',headers:[{key:'Referrer-Policy',value:'no-referrer'}]}, {source:'/pagar',headers:[{key:'Referrer-Policy',value:'no-referrer'},{key:'Cache-Control',value:'private, no-store'}]}, {source:'/pago/:path*',headers:[{key:'Referrer-Policy',value:'no-referrer'},{key:'Cache-Control',value:'private, no-store'}]}, {source:'/pedido/:path*',headers:[{key:'Referrer-Policy',value:'no-referrer'},{key:'Cache-Control',value:'private, no-store'}]}, {source:'/compra/:path*',headers:[{key:'Referrer-Policy',value:'no-referrer'},{key:'Cache-Control',value:'private, no-store'}]}];
  }
};
export default createNextIntlPlugin('./src/i18n/request.ts')(configuracion);
