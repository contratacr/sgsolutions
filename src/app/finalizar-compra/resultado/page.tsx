import {RetornoPago} from '@/components/retorno-pago';
import Link from 'next/link';
import {Check,Clock,X,Truck,ArrowRight} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { basePedidos, configuracionTilopay } from '@/lib/tilopay';

export async function generateMetadata() {
  const t = await getTranslations('ResultadoPago');
  return { title: t('titulo'), robots: { index: false, follow: false } };
}

export default async function ResultadoPago({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const t = await getTranslations('ResultadoPago');
  const { pedido } = await searchParams;
  let estado = 'pendiente';let prueba=false;let express=false;
  const config = configuracionTilopay(false);
  if (config && pedido && /^[0-9a-f-]{36}$/.test(pedido)) {
    const { data } = await basePedidos(config).from('pedidos_tilopay').select('estado,entorno,cliente').eq('id', pedido).maybeSingle();
    prueba=data?.entorno==='pruebas';express=data?.cliente?.modalidad==='express';
    if (data?.estado === 'pagado') estado = 'pagado';
    else if (data?.estado === 'rechazado') estado = 'rechazado';
  }
  return <main id="contenido" className="contenedor compra-pagina">
    <section className={`compra-bloque pago-resultado pago-resultado-${estado}`}>
      <p className="etiqueta">{t('etiqueta')}</p>
      {prueba&&<p className="panel-aviso">{t('prueba')}</p>}
      <div className="pago-resultado-icono" aria-hidden="true">{estado==='pagado'?<Check size={28}/>:estado==='rechazado'?<X size={28}/>:<Clock size={28}/>}</div>
      <h1>{t(estado)}</h1>
      <p className="pago-resultado-descripcion">{t(`${estado}Detalle`)}</p>{express&&<div className="pago-resultado-envio"><Truck size={20} aria-hidden="true"/><p>{t('expressSeparado')}</p></div>}
      <RetornoPago pedido={pedido} pagado={estado==='pagado'}/><Link className="boton boton-azul" href="/tienda">{t('volver')}<ArrowRight size={17} aria-hidden="true"/></Link>
    </section>
  </main>;
}
