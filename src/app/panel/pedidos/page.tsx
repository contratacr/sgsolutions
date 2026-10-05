import {IconoWhatsApp} from '@/components/icono-whatsapp';
import {EnlaceCompra} from '@/components/enlace-compra';
import {listarAsesorias,enlaceAprobado,referenciaAsesoria} from '@/lib/asesorias';
import {leerCatalogoPublico} from '@/lib/catalogo-servidor';
import {PrepararAsesoria} from '@/components/preparar-asesoria';
import {prepararPedidoAsesorado} from './asesoria-acciones';
import {headers} from 'next/headers';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { sesionLocal } from '@/lib/admin-local';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { basePedidosAdministracion } from '@/lib/tilopay';
import { colones } from '@/lib/catalogo-modelo';
import { accesoPedido, basePedidosManuales, configuracionPedidosManuales, numeroPedido, type EstadoPedidoManual } from '@/lib/pedidos-manuales';
import { actualizarPedidoManual } from './acciones';
import {costoEntrega} from '@/lib/envio';

type Pedido = {
  id: string;
  creado_en: string;
  estado: 'iniciado' | 'pendiente' | 'pagado' | 'rechazado' | 'error';
  entorno: 'pruebas' | 'produccion';
  total: number;
  cliente: { nombre?: string; apellidos?: string; correo?: string };
  articulos: { nombre?: string; cantidad?: number }[];
};

type Manual = {
  id: string; creado_en: string; estado: EstadoPedidoManual; metodo: 'sinpe' | 'transferencia';
  total_productos: number; costo_envio: number | null; total_cobrar: number | null;
  cliente: { nombre?: string; apellidos?: string; correo?: string; telefono?: string; modalidad?: string; direccion?: string };
  articulos: { nombre?: string; cantidad?: number }[];
  comprobante_path: string | null; correo_cliente_en: string | null; correo_pago_en: string | null;
};

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ resultado?: string }> }) {
  const local = await sesionLocal();
  if (!local) {
    const cliente = await crearClienteServidor();
    if (!cliente) redirect('/admin');
    const { data: { user } } = await cliente.auth.getUser();
    if (!user) redirect('/admin');
    const { data: perfil } = await cliente.from('perfiles').select('rol,activo').eq('id', user.id).maybeSingle();
    if (!perfil?.activo || perfil.rol !== 'administrador') redirect('/panel');
  }
  const t = await getTranslations('PedidosAdmin');
  const a=await getTranslations('AsesoriaAdmin');
  let solicitudes:Awaited<ReturnType<typeof listarAsesorias>>=[],errorAsesorias=false;
  try{solicitudes=await listarAsesorias();}catch{errorAsesorias=true;}
  const catalogo=await leerCatalogoPublico();
  const host=(await headers()).get('host')??'';
  const origen=local?`http://${host}`:process.env.PEDIDOS_ORIGEN_PUBLICO??'https://www.sgsolutionscr.com';
  const idioma = await getLocale();
  const db = basePedidosAdministracion();
  const { data, error } = db
    ? await db.from('pedidos_tilopay').select('id,creado_en,estado,entorno,total,cliente,articulos').order('creado_en', { ascending: false }).limit(50)
    : { data: null, error: null };
  const pedidos = (data ?? []) as Pedido[];
  const configManual = configuracionPedidosManuales();
  const manualDb = configManual ? basePedidosManuales(configManual) : null;
  const { data: manualData, error: manualError } = manualDb
    ? await manualDb.from('pedidos_manuales').select('id,creado_en,estado,metodo,total_productos,costo_envio,total_cobrar,cliente,articulos,comprobante_path,correo_cliente_en,correo_pago_en').order('creado_en', { ascending: false }).limit(50)
    : { data: null, error: null };
  const manuales = (manualData ?? []) as Manual[];
  const resultado = (await searchParams).resultado;
  const ahora=new Date().getTime();
  return <main id="contenido" className="contenedor seccion">
    <p className="etiqueta">{t('etiqueta')}</p>
    <h1>{t('titulo')}</h1>
    <p className="admin-guia">{t('descripcion')}</p>
    {resultado && ['guardado','sin_correo','error','invalido','no_disponible'].includes(resultado) && <p role="status" className="panel-aviso">{t(`resultado_${resultado}`)}</p>}
    <section className="asesorias-admin"><h2>{a('titulo')}</h2><p className="panel-aviso">{a('pendientes',{cantidad:solicitudes.filter(s=>s.estado==='solicitada').length})}</p><p>{a('descripcion')}</p><details><summary>{a('nueva')}</summary><PrepararAsesoria id="" articulos={[]} productos={catalogo.productos}/></details>{errorAsesorias?<p role="alert">{a('noDisponible')}</p>:!solicitudes.length?<p>{a('vacio')}</p>:<div className="pedidos-admin-lista">{solicitudes.map(s=><article key={s.id} className={`pedidos-admin-tarjeta ${s.estado==='solicitada'?'asesoria-pendiente':''}`}><div className="pedidos-admin-encabezado"><strong>{referenciaAsesoria(s.id)}</strong><span>{a(s.estado)}</span></div><p><time dateTime={s.creado_en}>{new Intl.DateTimeFormat(idioma==='en'?'en-US':'es-CR',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Costa_Rica'}).format(new Date(s.creado_en))}</time></p>{s.contacto&&<div className="asesoria-contacto"><strong>{s.contacto.nombre}</strong><p>{s.contacto.necesidad}</p><a className="boton boton-azul" href={`https://wa.me/${s.contacto.telefono}?text=${encodeURIComponent(a('mensajeContacto',{nombre:s.contacto.nombre,referencia:referenciaAsesoria(s.id)}))}`} target="_blank" rel="noopener noreferrer"><IconoWhatsApp width={20} height={20}/>{a('contactar')}<span className="sr-only">{a('nuevaPestana')}</span></a></div>}<ul>{s.articulos.map(x=><li key={x.producto.id}>{x.cantidad} × {x.producto.nombre[idioma==='en'?'en':'es']}</li>)}</ul>{['solicitada','aprobada'].includes(s.estado)&&<PrepararAsesoria id={s.id} articulos={s.articulos} productos={catalogo.productos}/>} {s.estado==='aprobada'&&s.vence_en&&Date.parse(s.vence_en)>ahora&&<EnlaceCompra key={s.token} url={enlaceAprobado(s,origen)}/>}{s.estado==='aprobada'&&s.vence_en&&Date.parse(s.vence_en)<=ahora&&<p>{a('vencida')}</p>}{['solicitada','aprobada'].includes(s.estado)&&<form action={prepararPedidoAsesorado}><input type="hidden" name="id" value={s.id}/><input type="hidden" name="cancelar" value="1"/><button className="boton boton-contorno">{a('cancelar')}</button></form>}</article>)}</div>}</section>
    <h2>{t('manualTitulo')}</h2>
    {!manualDb || manualError ? <p role="status">{t('configurarManual')}</p> : !manuales.length ? <p>{t('manualVacio')}</p> :
      <div className="pedidos-admin-lista">{await Promise.all(manuales.map(async p => {
        const envio = p.costo_envio ?? (p.estado === 'revision' ? costoEntrega(p.cliente?.modalidad === 'envio' ? 'envio' : 'retiro') : null);
        const total = p.total_cobrar ?? p.total_productos + (envio ?? 0);
        const enlace = new URL('/finalizar-compra/pedido', configManual!.origen);
        enlace.searchParams.set('pedido', p.id); enlace.searchParams.set('acceso', accesoPedido(configManual!, p.id));
        const comprobante = p.comprobante_path ? await manualDb.storage.from('comprobantes-pedidos').createSignedUrl(p.comprobante_path, 300) : null;
        return <article className="pedidos-admin-tarjeta" key={p.id}>
          <div className="pedidos-admin-encabezado"><div><strong>{p.cliente?.nombre} {p.cliente?.apellidos}</strong><small>{p.cliente?.correo} · {p.cliente?.telefono}</small></div><span className="pedidos-admin-estado">{t(`manual_${p.estado}`)}</span></div>
          <p>{new Intl.DateTimeFormat(idioma === 'en' ? 'en-US' : 'es-CR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Costa_Rica' }).format(new Date(p.creado_en))} · {t(`metodo_${p.metodo}`)} · {t(`modalidad_${p.cliente?.modalidad === 'envio' ? 'envio' : 'retiro'}`)}</p>
          {p.cliente?.direccion && <p>{p.cliente.direccion}</p>}
          <ul>{p.articulos?.map((item, index) => <li key={index}>{item.cantidad} × {item.nombre}</li>)}</ul>
          <div className="pedidos-admin-pie"><code>{numeroPedido(p.id)}</code><strong>{colones(total)}</strong></div>
          {envio !== null && <p>{t('costoEnvio')}: {colones(envio)}</p>}
          {p.estado === 'revision' && <p>{t('subtotalPendiente')}</p>}
          {comprobante?.data?.signedUrl && <p><a href={comprobante.data.signedUrl} target="_blank" rel="noopener noreferrer">{t('verComprobante')} <span className="sr-only">{t('nuevaPestana')}</span></a></p>}
          {(!p.correo_cliente_en || p.estado === 'pendiente_pago' && !p.correo_pago_en) && <div className="panel-aviso"><p>{t('correoPendiente')}</p><label>{t('enlaceCliente')}<input readOnly value={enlace.href} aria-label={t('enlaceCliente')} /></label></div>}
          {p.estado === 'revision' && <form action={actualizarPedidoManual} className="pedido-admin-form"><input type="hidden" name="id" value={p.id}/><input type="hidden" name="estado" value="pendiente_pago"/><button className="boton boton-azul">{t('confirmarYEnviar')}</button></form>}
          {(p.estado === 'pendiente_pago' || p.estado === 'comprobante_recibido') && <form action={actualizarPedidoManual} className="pedido-admin-form"><input type="hidden" name="id" value={p.id}/><input type="hidden" name="estado" value="pagado"/><p>{t('verificarBanco')}</p><button className="boton boton-azul">{t('marcarPagado')}</button></form>}
          {(p.estado === 'revision' || p.estado === 'pendiente_pago' || p.estado === 'comprobante_recibido') && <form action={actualizarPedidoManual}><input type="hidden" name="id" value={p.id}/><input type="hidden" name="estado" value="cancelado"/><button className="boton boton-contorno">{t('cancelar')}</button></form>}
        </article>;
      }))}</div>}
    <h2>{t('tarjetaTitulo')}</h2>
    {!db || error ? <p role="status">{t('configurar')}</p> : !pedidos.length ? <p>{t('vacio')}</p> :
      <div className="pedidos-admin-lista">
        {pedidos.map(pedido => <article className="pedidos-admin-tarjeta" key={pedido.id}>
          <div className="pedidos-admin-encabezado">
            <div><strong>{pedido.cliente?.nombre} {pedido.cliente?.apellidos}</strong><small>{pedido.cliente?.correo}</small></div>
            <span className="pedidos-admin-estado">{t(pedido.estado)}</span>
          </div>
          <p>{new Intl.DateTimeFormat(idioma === 'en' ? 'en-US' : 'es-CR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Costa_Rica' }).format(new Date(pedido.creado_en))} · {t(pedido.entorno)}</p>
          <ul>{pedido.articulos?.map((item, index) => <li key={index}>{item.cantidad} × {item.nombre}</li>)}</ul>
          <div className="pedidos-admin-pie"><code>{pedido.id}</code><strong>{colones(pedido.total)}</strong></div>
        </article>)}
      </div>}
  </main>;
}
