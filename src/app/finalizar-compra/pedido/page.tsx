import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { accesoValido, basePedidosManuales, configuracionPedidosManuales, numeroPedido, type EstadoPedidoManual } from '@/lib/pedidos-manuales';
import { leerContenido } from '@/lib/contenido-servidor';
import { colones } from '@/lib/catalogo-modelo';
import { SubirComprobante } from '@/components/subir-comprobante';

type PedidoConsulta = { estado: EstadoPedidoManual; metodo: 'sinpe' | 'transferencia'; total_productos: number; costo_envio: number | null; total_cobrar: number | null; articulos: { nombre: string; cantidad: number }[]; comprobante_path: string | null; correo_cliente_en: string | null };

export async function generateMetadata() {
  const t = await getTranslations('PedidoManual');
  return { title: t('titulo'), robots: { index: false, follow: false } };
}

export default async function PedidoManual({ searchParams }: { searchParams: Promise<{ pedido?: string; acceso?: string }> }) {
  const t = await getTranslations('PedidoManual');
  const { pedido: id = '', acceso = '' } = await searchParams;
  const config = configuracionPedidosManuales();
  let pedido: PedidoConsulta | null = null;
  if (config && accesoValido(config, id, acceso)) {
    const { data } = await basePedidosManuales(config).from('pedidos_manuales').select('estado,metodo,total_productos,costo_envio,total_cobrar,articulos,comprobante_path,correo_cliente_en').eq('id', id).maybeSingle();
    pedido = data as PedidoConsulta | null;
  }
  const pagos = pedido?.estado === 'pendiente_pago' ? (await leerContenido()).pagos : null;
  return <main id="contenido" className="contenedor compra-pagina">
    <section className="compra-bloque pedido-resultado">
      <p className="etiqueta">{t('etiqueta')}</p>
      <h1>{pedido ? t('creado') : t('noEncontrado')}</h1>
      {pedido ? <>
        <p className="pedido-numero">{t('numero')}: <strong>{numeroPedido(id)}</strong></p>
        {!pedido.correo_cliente_en && <p role="status" className="panel-aviso">{t('guardarEnlace')}</p>}
        <p role="status">{t(`estado_${pedido.estado}`)}</p>
        <ul>{pedido.articulos?.map((a, i) => <li key={i}>{a.cantidad} × {a.nombre}</li>)}</ul>
        <p>{t('subtotal')}: <strong>{colones(pedido.total_productos)}</strong></p>
        {pedido.costo_envio !== null && <p>{t('costoEnvio')}: <strong>{colones(pedido.costo_envio)}</strong></p>}
        {pedido.total_cobrar !== null && <p>{t(pedido.estado === 'revision' ? 'totalEstimado' : 'total')}: <strong>{colones(pedido.total_cobrar)}</strong></p>}
        {pedido.estado === 'revision' && <p>{t('esperarRevision')}</p>}
        {pedido.estado === 'pendiente_pago' && pagos && <section className="pedido-pago-datos">
          <h2>{t('datosPago')}</h2><p>{t('montoConfirmado')}</p><p>{pagos.titular}</p>
          {pedido.metodo === 'sinpe' ? <strong>{pagos.sinpe.replace(/(\d{4})(\d{4})/, '$1 $2')}</strong> : pagos.cuentas.map(c => <p key={c.iban}><strong>{c.banco}</strong><br/><code>{c.iban}</code></p>)}
          <p>{t('usarReferencia', { numero: numeroPedido(id) })}</p>
          <SubirComprobante pedido={id} acceso={acceso} />
          <p>{t('verificacion')}</p>
        </section>}
        {pedido.estado === 'comprobante_recibido' && <p>{t('verificacion')}</p>}
      </> : <p>{t('enlaceInvalido')}</p>}
      <Link className="boton boton-contorno" href="/soluciones">{t('volver')}</Link>
    </section>
  </main>;
}
