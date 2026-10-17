import {ArchivoPanel} from '@/components/archivo-panel';
import {puedeArchivar} from '@/lib/archivo-pedidos';
import {EstadosPedidoAdmin,GestionEntregaPedido} from '@/components/estados-pedido-admin';
import {estadoGestion,type EstadoEntrega} from '@/lib/estado-entrega';
import {ContactoPedidoAdmin} from '@/components/contacto-pedido-admin';
import {EliminarConsulta} from '@/components/eliminar-consulta';
import {EnlaceCompra} from '@/components/enlace-compra';
import {listarAsesorias,enlaceAprobado,referenciaAsesoria} from '@/lib/asesorias';
import {leerProductosAsesoria} from '@/lib/catalogo-servidor';
import {BandejaPedidosReales,type ItemPedidoReal} from '@/components/bandeja-pedidos-reales';
import {PrepararAsesoria} from '@/components/preparar-asesoria';
import {prepararPedidoAsesorado} from './asesoria-acciones';
import {headers} from 'next/headers';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { sesionLocal } from '@/lib/admin-local';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { basePedidosAdministracion } from '@/lib/tilopay';
import { colones } from '@/lib/catalogo-modelo';
import { enlacePedido, basePedidosManuales, configuracionPedidosManuales, numeroPedido, type EstadoPedidoManual } from '@/lib/pedidos-manuales';
import { actualizarPedidoManual, reenviarCorreoPedido } from './acciones';
import {costoEntrega} from '@/lib/envio';

type Pedido = {
  id: string;
  creado_en: string;
  estado_entrega: EstadoEntrega;
  archivado_en: string|null;
  estado: 'iniciado' | 'pendiente' | 'pagado' | 'rechazado' | 'error';
  entorno: 'pruebas' | 'produccion';
  resultado_tilopay: string|null;
  total: number;
  cliente: { nombre?: string; apellidos?: string; correo?: string; telefono?:string; direccion?:string; modalidad?:string };
  articulos: { nombre?: string; cantidad?: number }[];
};

type Manual = {
  id: string; creado_en: string; archivado_en:string|null; estado_entrega: EstadoEntrega; estado: EstadoPedidoManual; metodo: 'sinpe' | 'transferencia';
  total_productos: number; costo_envio: number | null; total_cobrar: number | null;
  cliente: { nombre?: string; apellidos?: string; correo?: string; telefono?: string; modalidad?: string; direccion?: string };
  articulos: { nombre?: string; cantidad?: number }[];
  comprobante_path: string | null; correo_cliente_en: string | null; correo_pago_en: string | null;
};

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ resultado?: string; asesoria?:string; seccion?:string; pedido?:string }> }) {
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
  const entregaT = await getTranslations('EntregaAdmin');
  const archivoT=await getTranslations('ArchivoPanel');
  const a=await getTranslations('AsesoriaAdmin');
  const propuesta=await getTranslations('PropuestaPedidos');
  const reales=await getTranslations('PedidosReales');
  let solicitudes:Awaited<ReturnType<typeof listarAsesorias>>=[],errorAsesorias=false;
  try{solicitudes=await listarAsesorias();}catch{errorAsesorias=true;}
  let productos:Awaited<ReturnType<typeof leerProductosAsesoria>>=[];
  try{productos=await leerProductosAsesoria();}catch{errorAsesorias=true;}
  const host=(await headers()).get('host')??'';
  const origen=local?`http://${host}`:process.env.PEDIDOS_ORIGEN_PUBLICO??`https://${host}`;
  const idioma = await getLocale();
  const db = basePedidosAdministracion();
  const { data, error } = db
    ? await db.from('pedidos_tilopay').select('id,creado_en,estado,estado_entrega,archivado_en,entorno,total,cliente,articulos,resultado_tilopay').order('creado_en', { ascending: false }).limit(50)
    : { data: null, error: null };
  const pedidos = (data ?? []) as Pedido[];
  const configManual = configuracionPedidosManuales();
  const manualDb = configManual ? basePedidosManuales(configManual) : null;
  const { data: manualData, error: manualError } = manualDb
    ? await manualDb.from('pedidos_manuales').select('id,creado_en,estado,estado_entrega,archivado_en,metodo,total_productos,costo_envio,total_cobrar,cliente,articulos,comprobante_path,correo_cliente_en,correo_pago_en').order('creado_en', { ascending: false }).limit(50)
    : { data: null, error: null };
  const manuales = (manualData ?? []) as Manual[];
  const contactosPedidos=new Map([...manuales,...pedidos].map(p=>[p.id,p.cliente]));
  const {resultado,asesoria:destacada,pedido:pedidoDestacado} = await searchParams;

  const ahora=new Date().getTime();
  const asesoriaItems:ItemPedidoReal[]=solicitudes.map(s=>({id:s.id,tipo:'asesoria',metodo:'enlace',modalidad:'',fecha:s.creado_en,estado:s.estado,archivado:Boolean(s.archivado_en),busqueda:[referenciaAsesoria(s.id,s.numero),s.contacto?.nombre,s.contacto?.telefono,s.contacto?.necesidad,...s.articulos.map(x=>x.producto.nombre.es+' '+x.producto.nombre.en+' '+x.producto.codigoFabricante)].join(' '),contenido:<article key={s.id} className={`pedidos-admin-tarjeta ${s.estado==='solicitada'?'asesoria-pendiente':''}`}>
          <details className="panel-pedido-detalle" open={s.id===destacada?true:undefined}>
            <summary><div><strong>{s.contacto?.nombre??referenciaAsesoria(s.id,s.numero)}</strong><small>{s.contacto?referenciaAsesoria(s.id,s.numero):s.articulos.slice(0,2).map(x=>x.producto.nombre[idioma==='en'?'en':'es']).join(' · ')}<br/><time dateTime={s.creado_en}>{new Intl.DateTimeFormat(idioma==='en'?'en-US':'es-CR',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Costa_Rica'}).format(new Date(s.creado_en))}</time></small>{s.archivado_en&&<span className="pedido-archivo-etiqueta">{archivoT('estadoArchivado')}</span>}</div><div><small>{reales('enlace')}</small><span className="pedidos-admin-estado">{a(s.estado)}</span></div><span>—</span><strong>—</strong></summary>
            <div className="panel-pedido-cuerpo">
            <ContactoPedidoAdmin key="contacto" cliente={{...s.contacto,...(s.pedido_id?contactosPedidos.get(s.pedido_id):{})}} referencia={referenciaAsesoria(s.id,s.numero)}/>
            {s.estado==='aprobada'&&s.vence_en&&Date.parse(s.vence_en)>ahora&&<><EnlaceCompra key={s.token} id={s.id} referencia={referenciaAsesoria(s.id,s.numero)} destacar={resultado==='enlace_generado'&&s.id===destacada} url={enlaceAprobado(s,origen)}/></>}
            {s.estado==='aprobada'&&s.vence_en&&Date.parse(s.vence_en)<=ahora&&<p className="panel-aviso">{a('vencida')}</p>}
            {['solicitada','aprobada'].includes(s.estado)?<PrepararAsesoria id={s.id} articulos={s.articulos} productos={productos}/>:<ul>{s.articulos.map(x=><li key={x.producto.id}>{x.cantidad} × {x.producto.nombre[idioma==='en'?'en':'es']}</li>)}</ul>}
            {['solicitada','aprobada'].includes(s.estado)&&<details className="panel-opciones-secundarias"><summary>{a('opciones')}</summary><p>{a('cancelarAyuda')}</p><form action={prepararPedidoAsesorado}><input type="hidden" name="id" value={s.id}/><input type="hidden" name="cancelar" value="1"/><button className="boton boton-contorno">{a('cancelar')}</button></form></details>}
            {(s.archivado_en||puedeArchivar('asesoria',s))&&<ArchivoPanel id={s.id} tipo="asesoria" referencia={referenciaAsesoria(s.id,s.numero)} archivado={Boolean(s.archivado_en)}/>}
            {s.estado==='cancelada'&&!s.pedido_id&&!s.archivado_en&&<EliminarConsulta id={s.id} referencia={referenciaAsesoria(s.id,s.numero)}/>}
            </div>
          </details>
        </article>}));
  const manualItems:ItemPedidoReal[]=await Promise.all(manuales.map(async p => {
        const envio = p.costo_envio ?? (p.estado === 'revision' ? costoEntrega(p.cliente?.modalidad === 'express'?'express':p.cliente?.modalidad === 'envio' ? 'envio' : 'retiro') : null);
        const total = p.total_cobrar ?? p.total_productos + (envio ?? 0);
        const enlace = new URL(enlacePedido(configManual!, p.id, configManual!.origen));
        const comprobante = p.comprobante_path ? await manualDb!.storage.from('comprobantes-pedidos').createSignedUrl(p.comprobante_path, 300) : null;
        return {id:p.id,tipo:'manual',metodo:p.metodo,modalidad:p.cliente?.modalidad??'retiro',fecha:p.creado_en,pago:p.estado,estado:estadoGestion(p.estado,p.estado_entrega),archivado:Boolean(p.archivado_en),busqueda:[numeroPedido(p.id),p.cliente.nombre,p.cliente.apellidos,p.cliente.correo,p.cliente.telefono,...p.articulos.map(x=>x.nombre)].join(' '),contenido:<article key={p.id} className="pedidos-admin-tarjeta"><details className="panel-pedido-detalle"><summary><div><strong>{p.cliente.nombre} {p.cliente.apellidos}</strong><small>{numeroPedido(p.id)} · <time dateTime={p.creado_en}>{new Intl.DateTimeFormat(idioma,{dateStyle:'medium'}).format(new Date(p.creado_en))}</time></small>{p.archivado_en&&<span className="pedido-archivo-etiqueta">{archivoT('estadoArchivado')}</span>}</div><div><small>{t(`metodo_${p.metodo}`)}</small><EstadosPedidoAdmin key="estados" pago={p.estado} entrega={p.estado_entrega}/></div><span>{t(`modalidad_${p.cliente?.modalidad==='express'?'express':p.cliente?.modalidad==='envio'?'envio':'retiro'}`)}</span><strong>{colones(total)}</strong></summary><div className="panel-pedido-cuerpo">
          <div className="pedido-real-contexto"><div className="pedidos-admin-encabezado"><div><strong>{p.cliente?.nombre} {p.cliente?.apellidos}</strong><small>{p.cliente?.correo} · {p.cliente?.telefono}</small></div></div>
          <p>{new Intl.DateTimeFormat(idioma === 'en' ? 'en-US' : 'es-CR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Costa_Rica' }).format(new Date(p.creado_en))} · {t(`metodo_${p.metodo}`)} · {t(`modalidad_${p.cliente?.modalidad === 'express'?'express':p.cliente?.modalidad === 'envio' ? 'envio' : 'retiro'}`)}</p>
          </div><div className="pedido-real-contacto"><ContactoPedidoAdmin key="contacto" cliente={p.cliente} referencia={numeroPedido(p.id)}/></div><div className="pedido-real-productos"><h3>{propuesta('productos')}</h3>
          <ul>{p.articulos?.map((item, index) => <li key={index}>{item.cantidad} × {item.nombre}</li>)}</ul>
          <div className="pedidos-admin-pie"><code>{numeroPedido(p.id)}</code><strong>{colones(total)}</strong></div>
          {p.cliente?.modalidad==='express'?<p>{t('expressSeparado')}</p>:envio !== null && <p>{t('costoEnvio')}: {colones(envio)}</p>}
          {p.estado === 'revision' && <p>{t('subtotalPendiente')}</p>}
          </div><div className="pedido-real-acciones">{comprobante?.data?.signedUrl && <p><a href={comprobante.data.signedUrl} target="_blank" rel="noopener noreferrer">{t('verComprobante')} <span className="sr-only">{t('nuevaPestana')}</span></a></p>}
          {(!p.correo_cliente_en || p.estado === 'pendiente_pago' && !p.correo_pago_en) && <div className="panel-aviso"><p>{t('correoPendiente')}</p><label>{t('enlaceCliente')}<input readOnly value={enlace.href} aria-label={t('enlaceCliente')} /></label></div>}
          {['pendiente_pago','comprobante_recibido','pagado'].includes(p.estado)&&<form action={reenviarCorreoPedido}><input type="hidden" name="id" value={p.id}/><button className="boton boton-contorno">{t('reenviarCorreo')}</button></form>}
          {(p.archivado_en||puedeArchivar('manual',p))&&<ArchivoPanel id={p.id} tipo="manual" referencia={numeroPedido(p.id)} archivado={Boolean(p.archivado_en)}/>}
          <GestionEntregaPedido key="gestion" id={p.id} tipo="manual" pago={p.estado} entrega={p.estado_entrega} modalidad={p.cliente?.modalidad}/>
          {p.estado==='pagado'&&<section className="panel-correo-info"><h3>{t('facturacionGti')}</h3><p>{t('facturacionGtiTexto')}</p><a className="boton boton-azul" href="https://www.facturaelectronica.cr/" target="_blank" rel="noopener noreferrer">{t('abrirGti')}<span className="sr-only">{t('nuevaPestana')}</span></a></section>}
          {p.estado === 'revision' && <form action={actualizarPedidoManual} className="pedido-admin-form"><input type="hidden" name="id" value={p.id}/><input type="hidden" name="estado" value="pendiente_pago"/><button className="boton boton-azul">{t('confirmarYEnviar')}</button></form>}
          {(p.estado === 'pendiente_pago' || p.estado === 'comprobante_recibido') && <form action={actualizarPedidoManual} className="pedido-admin-form"><input type="hidden" name="id" value={p.id}/><input type="hidden" name="estado" value="pagado"/><p>{t('verificarBanco')}</p><button className="boton boton-azul">{t('marcarPagado')}</button></form>}
          {(p.estado === 'revision' || p.estado === 'pendiente_pago' || p.estado === 'comprobante_recibido') && <form action={actualizarPedidoManual}><input type="hidden" name="id" value={p.id}/><input type="hidden" name="estado" value="cancelado"/><button className="boton boton-contorno">{t('cancelar')}</button></form>}
        </div></div></details></article>};
      }));
  const tarjetaItems:ItemPedidoReal[]=pedidos.map(pedido => ({id:pedido.id,tipo:'tarjeta',metodo:'tarjeta',modalidad:pedido.cliente?.modalidad??'retiro',fecha:pedido.creado_en,pago:pedido.estado,estado:estadoGestion(pedido.estado,pedido.estado_entrega),archivado:Boolean(pedido.archivado_en),busqueda:[pedido.id,pedido.cliente.nombre,pedido.cliente.apellidos,pedido.cliente.correo,...pedido.articulos.map(x=>x.nombre)].join(' '),contenido:<article key={pedido.id} className="pedidos-admin-tarjeta"><details className="panel-pedido-detalle"><summary><div><strong>{pedido.cliente.nombre} {pedido.cliente.apellidos}</strong><small>{numeroPedido(pedido.id)} · <time dateTime={pedido.creado_en}>{new Intl.DateTimeFormat(idioma,{dateStyle:'medium'}).format(new Date(pedido.creado_en))}</time> · {t(pedido.entorno)}</small>{pedido.archivado_en&&<span className="pedido-archivo-etiqueta">{archivoT('estadoArchivado')}</span>}</div><div><small>{propuesta('metodo_tarjeta')}</small><EstadosPedidoAdmin key="estados" pago={pedido.estado} entrega={pedido.estado_entrega}/></div><span>{t(`modalidad_${pedido.cliente?.modalidad==='express'?'express':pedido.cliente?.modalidad==='envio'?'envio':'retiro'}`)}</span><strong>{colones(pedido.total)}</strong></summary><div className="panel-pedido-cuerpo">
          <div className="pedido-real-contexto"><div className="pedidos-admin-encabezado">
            <div><strong>{pedido.cliente?.nombre} {pedido.cliente?.apellidos}</strong><small>{pedido.cliente?.correo}</small></div>

          </div>
          <p>{new Intl.DateTimeFormat(idioma === 'en' ? 'en-US' : 'es-CR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Costa_Rica' }).format(new Date(pedido.creado_en))} · {t(pedido.entorno)}</p>
          </div><div className="pedido-real-acciones">{(pedido.archivado_en||puedeArchivar('tarjeta',pedido))&&<ArchivoPanel id={pedido.id} tipo="tarjeta" referencia={numeroPedido(pedido.id)} archivado={Boolean(pedido.archivado_en)}/>}
          {pedido.estado==='rechazado'&&<p><strong>{t('motivoTilopay')}:</strong> {pedido.resultado_tilopay?.trim()||t('motivoNoInformado')}</p>}
          <GestionEntregaPedido key="gestion" id={pedido.id} tipo="tarjeta" pago={pedido.estado} entrega={pedido.estado_entrega} modalidad={pedido.cliente?.modalidad}/>
          {pedido.cliente?.modalidad==='express'&&<p>{t('expressSeparado')}</p>}</div><div className="pedido-real-contacto"><ContactoPedidoAdmin key="contacto" cliente={pedido.cliente} referencia={numeroPedido(pedido.id)}/></div><div className="pedido-real-productos"><h3>{propuesta('productos')}</h3>
          <ul>{pedido.articulos?.map((item, index) => <li key={index}>{item.cantidad} × {item.nombre}</li>)}</ul>
          <div className="pedidos-admin-pie"><code>{pedido.id}</code><strong>{colones(pedido.total)}</strong></div>
        </div></div></details></article>}));
  return <main id="contenido" className="contenedor seccion panel-pedidos-ordenados pedidos-reales">
    <h1 className="sr-only">{t('titulo')}</h1>
    {resultado && ['guardado','sin_correo','error','invalido','no_disponible','enlace_generado','asesoria_cancelada','consulta_eliminada'].includes(resultado) && <p role="status" className="panel-aviso">{t(`resultado_${resultado}`)}</p>}
    {resultado==='entrega_conflicto'&&<p role="alert" className="panel-aviso">{entregaT('conflicto')}</p>}
    {resultado==='entrega_guardada'&&<p role="status" className="panel-aviso">{entregaT('guardado')}</p>}
    {['archivado','restaurado','archivo_conflicto'].includes(resultado??'')&&<p role={resultado==='archivo_conflicto'?'alert':'status'} className="panel-aviso">{archivoT(resultado==='archivo_conflicto'?'conflicto':resultado!)}</p>}

    {errorAsesorias&&<p role="alert">{a('noDisponible')}</p>}
    {(!manualDb||manualError)&&<p role="alert">{t('configurarManual')}</p>}
    {(!db||error)&&<p role="alert">{t('configurar')}</p>}
    <BandejaPedidosReales key={[resultado,pedidoDestacado,destacada,...manuales.map(p=>p.id+p.estado+p.estado_entrega+p.archivado_en),...pedidos.map(p=>p.id+p.estado+p.estado_entrega+p.archivado_en),...solicitudes.map(s=>s.id+s.estado+s.archivado_en)].join('|')} items={[...asesoriaItems,...manualItems,...tarjetaItems]} destacado={pedidoDestacado??destacada} crear={<PrepararAsesoria id="" articulos={[]} productos={productos}/>}/>
  </main>;
}
