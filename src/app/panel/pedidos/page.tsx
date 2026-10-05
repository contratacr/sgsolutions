import {IconoWhatsApp} from '@/components/icono-whatsapp';
import {EnlaceCompra} from '@/components/enlace-compra';
import {listarAsesorias,enlaceAprobado,referenciaAsesoria} from '@/lib/asesorias';
import {leerProductosAsesoria} from '@/lib/catalogo-servidor';
import {ListaPanel,SeccionesPedidos} from '@/components/lista-panel';
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

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ resultado?: string; asesoria?:string }> }) {
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
  let productos:Awaited<ReturnType<typeof leerProductosAsesoria>>=[];
  try{productos=await leerProductosAsesoria();}catch{errorAsesorias=true;}
  const host=(await headers()).get('host')??'';
  const origen=local?`http://${host}`:process.env.PEDIDOS_ORIGEN_PUBLICO??`https://${host}`;
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
  const {resultado,asesoria:destacada} = await searchParams;
  const lista=await getTranslations('PanelLista');
  const ahora=new Date().getTime();
  return <main id="contenido" className="contenedor seccion">
    <p className="etiqueta">{t('etiqueta')}</p>
    <h1>{t('titulo')}</h1>
    <p className="admin-guia">{t('descripcion')}</p>
    {resultado && ['guardado','sin_correo','error','invalido','no_disponible','enlace_generado','asesoria_cancelada'].includes(resultado) && <p role="status" className="panel-aviso">{t(`resultado_${resultado}`)}</p>}
    <SeccionesPedidos inicial={resultado&&['guardado','sin_correo','no_disponible'].includes(resultado)?'manuales':'asesorias'} secciones={[
      {id:'asesorias',nombre:a('titulo'),cantidad:solicitudes.filter(s=>s.estado==='solicitada').length,contenido:<section className="asesorias-admin">
        <div className="panel-seccion-cabecera"><div><h2>{a('titulo')}</h2><p>{a('descripcion')}</p></div></div>
        <details className="panel-nueva-asesoria"><summary>{a('nueva')}</summary><PrepararAsesoria id="" articulos={[]} productos={productos}/></details>
        {errorAsesorias?<p role="alert">{a('noDisponible')}</p>:<ListaPanel inicial={resultado==='asesoria_cancelada'?'historial':'activos'} filtros={[{id:'activos',texto:lista('activos'),estados:['solicitada','aprobada']},{id:'pendientes',texto:lista('pendientes'),estados:['solicitada']},{id:'historial',texto:lista('historial'),estados:['procesando','utilizada','cancelada']},{id:'todos',texto:lista('todos')}]} items={solicitudes.map(s=>({id:s.id,estado:s.estado,busqueda:[referenciaAsesoria(s.id),s.contacto?.nombre,s.contacto?.telefono,s.contacto?.necesidad,...s.articulos.map(x=>x.producto.nombre.es+' '+x.producto.nombre.en+' '+x.producto.codigoFabricante)].join(' '),contenido:<article className={`pedidos-admin-tarjeta ${s.estado==='solicitada'?'asesoria-pendiente':''}`}>
          <details className="panel-pedido-detalle" open={s.id===destacada?true:undefined}>
            <summary><div><strong>{s.contacto?.nombre??referenciaAsesoria(s.id)}</strong><small>{s.contacto?referenciaAsesoria(s.id):s.articulos.slice(0,2).map(x=>x.producto.nombre[idioma==='en'?'en':'es']).join(' · ')}<br/><time dateTime={s.creado_en}>{new Intl.DateTimeFormat(idioma==='en'?'en-US':'es-CR',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Costa_Rica'}).format(new Date(s.creado_en))}</time></small></div><span className="pedidos-admin-estado">{a(s.estado)}</span></summary>
            <div className="panel-pedido-cuerpo">
            {s.contacto&&<div className="asesoria-contacto"><p>{s.contacto.necesidad}</p><a className="boton boton-azul" href={`https://wa.me/${s.contacto.telefono}?text=${encodeURIComponent(a('mensajeContacto',{nombre:s.contacto.nombre,referencia:referenciaAsesoria(s.id)}))}`} target="_blank" rel="noopener noreferrer"><IconoWhatsApp width={20} height={20}/>{a('contactar')}<span className="sr-only">{a('nuevaPestana')}</span></a></div>}
            {s.estado==='aprobada'&&s.vence_en&&Date.parse(s.vence_en)>ahora&&<><p className="panel-ayuda">{a('compartirAyuda')}</p><EnlaceCompra key={s.token} url={enlaceAprobado(s,origen)}/></>}
            {s.estado==='aprobada'&&s.vence_en&&Date.parse(s.vence_en)<=ahora&&<p className="panel-aviso">{a('vencida')}</p>}
            {['solicitada','aprobada'].includes(s.estado)?<PrepararAsesoria id={s.id} articulos={s.articulos} productos={productos}/>:<ul>{s.articulos.map(x=><li key={x.producto.id}>{x.cantidad} × {x.producto.nombre[idioma==='en'?'en':'es']}</li>)}</ul>}
            {['solicitada','aprobada'].includes(s.estado)&&<details className="panel-opciones-secundarias"><summary>{a('opciones')}</summary><p>{a('cancelarAyuda')}</p><form action={prepararPedidoAsesorado}><input type="hidden" name="id" value={s.id}/><input type="hidden" name="cancelar" value="1"/><button className="boton boton-contorno">{a('cancelar')}</button></form></details>}
            </div>
          </details>
        </article>}))}/>}</section>},
      {id:'manuales',nombre:t('manualTitulo'),cantidad:manuales.length,contenido:<section className="panel-pedidos-seccion">
    <h2>{t('manualTitulo')}</h2>
    <aside className="panel-correo-info"><h3>{t('correoOrigen')}</h3><p>{t('correoExplicacion')}</p><p>{process.env.SG_ENTORNO==='produccion'&&process.env.BREVO_API_KEY&&process.env.BREVO_REMITENTE?t('correoRemitente',{correo:process.env.BREVO_REMITENTE}):t('correoSinConfig')}</p></aside>
    {!manualDb || manualError ? <p role="status">{t('configurarManual')}</p> : !manuales.length ? <p>{t('manualVacio')}</p> :
      <ListaPanel filtros={[{id:'todos',texto:lista('todos')},{id:'activos',texto:lista('activos'),estados:['revision','pendiente_pago','comprobante_recibido']},{id:'historial',texto:lista('historial'),estados:['pagado','cancelado']}]} items={await Promise.all(manuales.map(async p => {
        const envio = p.costo_envio ?? (p.estado === 'revision' ? costoEntrega(p.cliente?.modalidad === 'envio' ? 'envio' : 'retiro') : null);
        const total = p.total_cobrar ?? p.total_productos + (envio ?? 0);
        const enlace = new URL('/finalizar-compra/pedido', configManual!.origen);
        enlace.searchParams.set('pedido', p.id); enlace.searchParams.set('acceso', accesoPedido(configManual!, p.id));
        const comprobante = p.comprobante_path ? await manualDb.storage.from('comprobantes-pedidos').createSignedUrl(p.comprobante_path, 300) : null;
        return {id:p.id,estado:p.estado,busqueda:[numeroPedido(p.id),p.cliente.nombre,p.cliente.apellidos,p.cliente.correo,p.cliente.telefono,...p.articulos.map(x=>x.nombre)].join(' '),contenido:<article className="pedidos-admin-tarjeta"><details className="panel-pedido-detalle"><summary><div><strong>{p.cliente.nombre} {p.cliente.apellidos}</strong><small>{numeroPedido(p.id)} · {colones(total)}</small></div><span className="pedidos-admin-estado">{t(`manual_${p.estado}`)}</span></summary><div className="panel-pedido-cuerpo">
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
        </div></details></article>};
      }))}/> }
      </section>},
      {id:'tarjeta',nombre:t('tarjetaTitulo'),cantidad:pedidos.length,contenido:<section className="panel-pedidos-seccion">
    <h2>{t('tarjetaTitulo')}</h2>
    {!db || error ? <p role="status">{t('configurar')}</p> : !pedidos.length ? <p>{t('vacio')}</p> :
      <ListaPanel filtros={[{id:'todos',texto:lista('todos')},{id:'pagado',texto:t('pagado'),estados:['pagado']},{id:'pendiente',texto:lista('activos'),estados:['iniciado','pendiente','error','rechazado']}]} items={pedidos.map(pedido => ({id:pedido.id,estado:pedido.estado,busqueda:[pedido.id,pedido.cliente.nombre,pedido.cliente.apellidos,pedido.cliente.correo,...pedido.articulos.map(x=>x.nombre)].join(' '),contenido:<article className="pedidos-admin-tarjeta"><details className="panel-pedido-detalle"><summary><div><strong>{pedido.cliente.nombre} {pedido.cliente.apellidos}</strong><small>{colones(pedido.total)} · {t(pedido.entorno)}</small></div><span className="pedidos-admin-estado">{t(pedido.estado)}</span></summary><div className="panel-pedido-cuerpo">
          <div className="pedidos-admin-encabezado">
            <div><strong>{pedido.cliente?.nombre} {pedido.cliente?.apellidos}</strong><small>{pedido.cliente?.correo}</small></div>
            <span className="pedidos-admin-estado">{t(pedido.estado)}</span>
          </div>
          <p>{new Intl.DateTimeFormat(idioma === 'en' ? 'en-US' : 'es-CR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Costa_Rica' }).format(new Date(pedido.creado_en))} · {t(pedido.entorno)}</p>
          <ul>{pedido.articulos?.map((item, index) => <li key={index}>{item.cantidad} × {item.nombre}</li>)}</ul>
          <div className="pedidos-admin-pie"><code>{pedido.id}</code><strong>{colones(pedido.total)}</strong></div>
        </div></details></article>}))}/> }
      </section>}
    ]}/>
  </main>;
}
