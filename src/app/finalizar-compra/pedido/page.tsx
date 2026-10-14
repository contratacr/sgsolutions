import Link from 'next/link';
import {ClipboardCheck,Clock3,ShieldCheck,CircleX} from 'lucide-react';
import {cuentaCorta} from '@/lib/cuentas-bancarias';
import { getTranslations } from 'next-intl/server';
import { accesoValido, basePedidosManuales, configuracionPedidosManuales, numeroPedido, type EstadoPedidoManual } from '@/lib/pedidos-manuales';
import { leerContenido } from '@/lib/contenido-servidor';
import { colones } from '@/lib/catalogo-modelo';
import { SubirComprobante } from '@/components/subir-comprobante';

type PedidoConsulta = { cliente?:{modalidad?:string}; estado: EstadoPedidoManual; metodo: 'sinpe' | 'transferencia'; total_productos: number; costo_envio: number | null; total_cobrar: number | null; articulos: { nombre: string; cantidad: number }[]; comprobante_path: string | null; correo_cliente_en: string | null };

export async function generateMetadata() {
  const t = await getTranslations('PedidoManual');
  return { title: t('titulo'), robots: { index: false, follow: false } };
}

export default async function PedidoManual({ searchParams }: { searchParams: Promise<{ pedido?: string; acceso?: string; comprobante?:string }> }) {
  const t = await getTranslations('PedidoManual');
  const { pedido: id = '', acceso = '', comprobante } = await searchParams;
  const config = configuracionPedidosManuales();
  let pedido: PedidoConsulta | null = null;
  if (config && accesoValido(config, id, acceso)) {
    const { data } = await basePedidosManuales(config).from('pedidos_manuales').select('cliente,estado,metodo,total_productos,costo_envio,total_cobrar,articulos,comprobante_path,correo_cliente_en').eq('id', id).maybeSingle();
    pedido = data as PedidoConsulta | null;
  }
  const pagos = pedido?.estado === 'pendiente_pago' ? (await leerContenido()).pagos : null;
  return <main id="contenido" className="contenedor compra-pagina">
    <section className="compra-bloque pedido-resultado">
      <header className="pedido-confirmacion-cabecera"><span className="pedido-confirmacion-icono"><ClipboardCheck size={28} aria-hidden="true"/></span><div><p className="etiqueta">{t('etiqueta')}</p><h1>{pedido ? t('creado') : t('noEncontrado')}</h1></div></header>
      {pedido ? <>
        <p className="pedido-numero">{t('numero')}: <strong>{numeroPedido(id)}</strong></p>
        {!pedido.correo_cliente_en && <p role="status" className="panel-aviso">{t('guardarEnlace')}</p>}
        <p role="status" className="pedido-confirmacion-estado">{pedido.estado==='pagado'?<ShieldCheck size={19} aria-hidden="true"/>:pedido.estado==='cancelado'?<CircleX size={19} aria-hidden="true"/>:<Clock3 size={19} aria-hidden="true"/>}<span>{t(`estado_${pedido.estado}`)}</span></p>
        <div className="pedido-confirmacion-resumen"><section className="pedido-confirmacion-productos"><h2>{t('productos')}</h2><ul>{pedido.articulos?.map((a,i)=><li key={i}><span className="pedido-confirmacion-cantidad">{a.cantidad} ×</span><span>{a.nombre}</span></li>)}</ul></section><section className="pedido-confirmacion-importes"><h2>{t('resumen')}</h2><dl><div><dt>{t('subtotal')}</dt><dd>{colones(pedido.total_productos)}</dd></div>{pedido.cliente?.modalidad==='express'?<div><dt>{t('costoEnvio')}</dt><dd>{t('expressSeparado')}</dd></div>:pedido.costo_envio!==null&&<div><dt>{t('costoEnvio')}</dt><dd>{colones(pedido.costo_envio)}</dd></div>}{pedido.total_cobrar!==null&&<div className="pedido-confirmacion-total"><dt>{t(pedido.estado==='revision'?'totalEstimado':'total')}</dt><dd>{colones(pedido.total_cobrar)}</dd></div>}</dl></section></div>
        {pedido.estado === 'revision' && <p>{t('esperarRevision')}</p>}
        {pedido.estado === 'pendiente_pago' && pagos && <section className="pedido-pago-datos">
          <h2>{t('datosPago')}</h2><p>{t('montoConfirmado')}</p><p>{pagos.titular}</p>
          {pedido.metodo === 'sinpe' ? <strong>{pagos.sinpe.replace(/(\d{4})(\d{4})/, '$1 $2')}</strong> : pagos.cuentas.map(c => <p key={c.iban}><strong>{c.banco}</strong>{cuentaCorta(c) && <span>{t('cuentaCorta')}: <code>{cuentaCorta(c)}</code></span>}<span>{t('iban')}: <code>{c.iban}</code></span></p>)}
          <p>{t('usarReferencia', { numero: numeroPedido(id) })}</p>
          {comprobante==='pendiente'&&<p role="alert">{t('reintentarComprobante')}</p>}
          <SubirComprobante pedido={id} acceso={acceso} />
          <p>{t('verificacion')}</p>
        </section>}
        {pedido.estado === 'pagado'&&<p>{t('facturaGti')}</p>}
        {pedido.estado === 'comprobante_recibido' && <p className="pedido-confirmacion-ayuda">{t('verificacion')}</p>}
      </> : <p>{t('enlaceInvalido')}</p>}
      <Link className="boton boton-contorno" href="/tienda">{t('volver')}</Link>
    </section>
  </main>;
}
