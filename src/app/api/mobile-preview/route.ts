import {NextResponse} from 'next/server';

export async function GET() {
  const isolated = process.env.NODE_ENV === 'development' && process.env.SG_ENTORNO === 'local'
    && process.env.SG_MOBILE_PREVIEW === '1' && process.env.SG_PRUEBAS_INTEGRACION === '1'
    && !process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.CUENTAS_SUPABASE_URL
    && !process.env.BREVO_API_KEY && !process.env.TILOPAY_API_KEY && !process.env.SG_SERVICIOS_PRUEBA_ACTIVOS;
  if (!isolated) return new NextResponse(null, {status: 404});
  return NextResponse.json({isolated: true}, {headers: {'Cache-Control': 'no-store'}});
}
