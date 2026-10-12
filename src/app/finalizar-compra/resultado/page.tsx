import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { basePedidos, configuracionTilopay } from '@/lib/tilopay';

export async function generateMetadata() {
  const t = await getTranslations('ResultadoPago');
  return { title: t('titulo'), robots: { index: false, follow: false } };
}

export default async function ResultadoPago({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const t = await getTranslations('ResultadoPago');
  const { pedido } = await searchParams;
  let estado = 'pendiente';
  const config = configuracionTilopay(false);
  if (config && pedido && /^[0-9a-f-]{36}$/.test(pedido)) {
    const { data } = await basePedidos(config).from('pedidos_tilopay').select('estado').eq('id', pedido).maybeSingle();
    if (data?.estado === 'pagado') estado = 'pagado';
    else if (data?.estado === 'rechazado') estado = 'rechazado';
  }
  return <main id="contenido" className="contenedor compra-pagina">
    <section className="compra-bloque" style={{ maxWidth: 720, margin: '5rem auto', textAlign: 'center' }}>
      <p className="etiqueta">{t('etiqueta')}</p>
      <h1>{t(estado)}</h1>
      <p>{t(`${estado}Detalle`)}</p>
      <Link className="boton boton-azul" href="/tienda">{t('volver')}</Link>
    </section>
  </main>;
}
