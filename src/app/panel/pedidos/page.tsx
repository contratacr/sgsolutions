import {exigirAdminMfa} from '@/lib/acceso-panel';
import {ArchivoPanel} from '@/components/archivo-panel';
import {puedeArchivar,motivoNoArchivable} from '@/lib/archivo-pedidos';
import {EstadosPedidoAdmin,GestionEntregaPedido} from '@/components/estados-pedido-admin';
import {ConfirmarAccionPedido} from '@/components/archivo-panel';
import {Fragment,isValidElement,type ReactNode} from 'react';
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
import { actualizarPedidoManual, reenviarCorreoPedido,resolverInventarioPedido } from './acciones';
import {costoEntrega} from '@/lib/envio';

type Pedido = {
  id: string; referencia_numero?:number;
  creado_en: string;
  estado_entrega: EstadoEntrega;
  archivado_en: string|null;archivado_motivo?:string|null;inventario_alerta?:boolean;
  estado: 'iniciado' | 'pendiente' | 'pagado' | 'rechazado' | 'error';
  entorno: 'pruebas' | 'produccion';
  resultado_tilopay: string|null;aviso_intento_estado?:string;
  total: number;
  cliente: { nombre?: string; apellidos?: string; correo?: string; telefono?:string; direccion?:string; modalidad?:string };
  articulos: { nombre?: string; cantidad?: number }[];
};

type Manual = {
  id: string; referencia_numero?:number; creado_en: string; archivado_en:string|null;archivado_motivo?:string|null;inventario_alerta?:boolean; estado_entrega: EstadoEntrega; estado: EstadoPedidoManual; metodo: 'sinpe' | 'transferencia';
  total_productos: number; costo_envio: number | null; total_cobrar: number | null;
  cliente: { nombre?: string; apellidos?: string; correo?: string; telefono?: string; modalidad?: string; direccion?: string };
  articulos: { nombre?: string; cantidad?: number }[];
  comprobante_path: string | null; correo_cliente_en: string | null; correo_pago_en: string | null;
};

/** Fixed detail order for every order type: summary/status, products, customer and delivery, main action, secondary actions, then archive/cancel. */
function DetallePedido({resumen,productos,cliente,principal=[],secundarias=[],cierre=[]}:{resumen:ReactNode;productos:ReactNode;cliente:ReactNode;principal?:ReactNode[];secundarias?:ReactNode[];cierre?:ReactNode[]}){
 const bloque=(clase:string,lista:ReactNode[])=>{const visibles=lista.filter(Boolean);return visibles.length?<div className={clase}>{visibles.map((nodo,i)=><Fragment key={isValidElement(nodo)&&nodo.key!==null?nodo.key:i}>{nodo}</Fragment>)}</div>:null;};
 return <div className="panel-pedido-cuerpo pedido-detalle"><section className="pedido-detalle-resumen">{resumen}</section><section className="pedido-detalle-productos">{productos}</section><div className="pedido-detalle-cliente">{cliente}</div>{bloque('pedido-detalle-principal',principal)}{bloque('pedido-detalle-secundarias',secundarias)}{bloque('pedido-detalle-cierre',cierre)}</div>;
}

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ resultado?: string; asesoria?:string; seccion?:string; pedido?:string }> }) {
 await exigirAdminMfa();
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
  const panelT=await getTranslations('Panel');
  let solicitudes:Awaited<ReturnType<typeof listarAsesorias>>=[],errorAsesorias=false;
  try{solicitudes=await listarAsesorias();}catch{errorAsesorias=true;}
  let productos:Awaited<ReturnType<typeof leerProductosAsesoria>>=[];
  try{productos=await leerProductosAsesoria();}catch{errorAsesorias=true;}
  const host=(await headers()).get('host')??'';
  const origen=local?`http://${host}`:process.env.PEDIDOS_ORIGEN_PUBLICO??`https://${host}`;
  const idioma = await getLocale();
  const db = basePedidosAdministracion();
  const { data, error } = db
    ? await db.from('pedidos_tilopay').select('id,referencia_numero,creado_en,estado,estado_entrega,archivado_en,archivado_motivo,inventario_alerta,entorno,total,cliente,articulos,resultado_tilopay,aviso_intento_estado').order('creado_en', { ascending: false }).limit(50)
    : { data: null, error: null };
  const pedidos = (data ?? []) as Pedido[];
  const configManual = configuracionPedidosManuales();
  const manualDb = configManual ? basePedidosManuales(configManual) : null;
  const { data: manualData, error: manualError } = manualDb
    ? await manualDb.from('pedidos_manuales').select('id,referencia_numero,creado_en,estado,estado_entrega,archivado_en,archivado_motivo,inventario_alerta,metodo,total_productos,costo_envio,total_cobrar,cliente,articulos,comprobante_path,correo_cliente_en,correo_pago_en').order('creado_en', { ascending: false }).limit(50)
    : { data: null, error: null };
  const manuales = (manualData ?? []) as Manual[];
  const contactosPedidos=new Map([...manuales,...pedidos].map(p=>[p.id,p.cliente]));
  const {resultado,asesoria:destacada,pedido:pedidoDestacado} = await searchParams;

  const ahora=new Date().getTime();
  // One formatter for list rows and details, always in Costa Rica time.
  const formato=new Intl.DateTimeFormat(idioma==='en'?'en-US':'es-CR',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Costa_Rica'});
  const fecha=(iso:string)=><time dateTime={iso}>{formato.format(new Date(iso))}</time>;
  const modalidad=(m?:string)=>m==='digital'?'digital':m==='express'?'express':m==='envio'?'envio':'retiro';
  const dato=(etiqueta:string,valor:ReactNode)=><div><dt>{etiqueta}</dt><dd>{valor}</dd></div>;
  const tonoAsesoria=(estado:string,vencida:boolean)=>vencida?'neutro':estado==='solicitada'?'aviso':estado==='utilizada'?'exito':estado==='cancelada'?'neutro':'info';
  const notaArchivo=(motivo:ReturnType<typeof motivoNoArchivable>)=>motivo&&<p className="panel-ayuda pedido-archivo-nota">{reales(`archivo_${motivo}`)}</p>;
  const asesoriaItems:ItemPedidoReal[]=solicitudes.map(s=>{
   const referencia=referenciaAsesoria(s.id,s.numero,s.referencia_numero);
   const vencida=s.estado==='aprobada'&&Boolean(s.vence_en)&&Date.parse(s.vence_en!)<=ahora;
   const vigente=s.estado==='aprobada'&&Boolean(s.vence_en)&&Date.parse(s.vence_en!)>ahora;
   const editable=['solicitada','aprobada'].includes(s.estado);
   const estadoTexto=vencida?reales('enlaceVencido'):a(s.estado);
   return {id:s.id,tipo:'asesoria',metodo:'enlace',modalidad:'',fecha:s.creado_en,estado:s.estado,vencida,archivado:Boolean(s.archivado_en),busqueda:[referenciaAsesoria(s.id,s.numero,s.referencia_numero),referenciaAsesoria(s.id,s.numero),numeroPedido(s.id),s.id,s.contacto?.nombre,s.contacto?.telefono,s.contacto?.necesidad,...s.articulos.map(x=>x.producto.nombre.es+' '+x.producto.nombre.en+' '+x.producto.codigoFabricante)].join(' '),contenido:<article key={s.id} className={`pedidos-admin-tarjeta ${s.estado==='solicitada'?'asesoria-pendiente':''}`}>
          <details className="panel-pedido-detalle" open={s.id===destacada?true:undefined}>
            <summary><div><strong>{s.contacto?.nombre??referencia}</strong><small>{s.contacto?referencia:s.articulos.slice(0,2).map(x=>x.producto.nombre[idioma==='en'?'en':'es']).join(' · ')}<br/>{fecha(s.creado_en)}</small>{s.archivado_en&&<span className="pedido-archivo-etiqueta">{archivoT('estadoArchivado')}</span>}</div><div><small>{reales('enlace')}</small><span className="panel-chip" data-tono={tonoAsesoria(s.estado,vencida)}>{estadoTexto}</span>{s.estado==='aprobada'&&s.vence_en&&<small>{reales(vencida?'vencio':'vence')} {fecha(s.vence_en)}</small>}</div><span>—</span><strong>—</strong></summary>
            <DetallePedido
             resumen={<><dl className="pedido-detalle-datos">{dato(reales('referencia'),<code>{referencia}</code>)}{dato(reales('creado'),fecha(s.creado_en))}{dato(reales('estado'),<span className="panel-chip" data-tono={tonoAsesoria(s.estado,vencida)}>{estadoTexto}</span>)}{s.estado==='aprobada'&&s.vence_en&&dato(reales(vencida?'vencio':'vence'),fecha(s.vence_en))}</dl>{vencida&&<p className="panel-aviso">{a('vencida')}</p>}</>}
             productos={editable?<PrepararAsesoria id={s.id} articulos={s.articulos} productos={productos}/>:<><h3>{propuesta('productos')}</h3><ul>{s.articulos.map(x=><li key={x.producto.id}>{x.cantidad} × {x.producto.nombre[idioma==='en'?'en':'es']}</li>)}</ul></>}
             cliente={<ContactoPedidoAdmin key="contacto" cliente={{...s.contacto,...(s.pedido_id?contactosPedidos.get(s.pedido_id):{})}} referencia={referencia}/>}
             principal={[vigente&&<EnlaceCompra key={s.token} id={s.id} referencia={referencia} destacar={resultado==='enlace_generado'&&s.id===destacada} url={enlaceAprobado(s,origen)}/>]}
             cierre={[editable&&<div className="panel-opciones-secundarias"><p>{a('cancelarAyuda')}</p><ConfirmarAccionPedido accion={prepararPedidoAsesorado} campos={{id:s.id,cancelar:'1'}} boton={a('cancelar')} titulo={reales('cancelarAsesoriaTitulo',{referencia})} descripcion={a('cancelarAyuda')} detalles={[reales('cancelarAsesoriaEnlace'),reales('cancelarSinCorreo')]} confirmar={a('cancelar')} peligro/></div>,(s.archivado_en||puedeArchivar('asesoria',s))&&<ArchivoPanel id={s.id} tipo="asesoria" referencia={referencia} archivado={Boolean(s.archivado_en)} motivo={s.archivado_motivo} vencido={vencida}/>,s.estado==='cancelada'&&!s.pedido_id&&!s.archivado_en&&<EliminarConsulta id={s.id} referencia={referencia}/>]}/>
          </details>
        </article>};});
  const manualItems:ItemPedidoReal[]=manuales.map(p => {
        const envio = p.costo_envio ?? (p.estado === 'revision' ? costoEntrega(modalidad(p.cliente?.modalidad)) : null);
        const total = p.total_cobrar ?? p.total_productos + (envio ?? 0);
        const enlace = new URL(enlacePedido(configManual!, p.id, configManual!.origen));
        const numero=numeroPedido(p.id,p.referencia_numero);
        const activo=['revision','pendiente_pago','comprobante_recibido'].includes(p.estado);
        return {id:p.id,tipo:'manual',metodo:p.metodo,modalidad:p.cliente?.modalidad??'retiro',fecha:p.creado_en,pago:p.estado,estado:estadoGestion(p.estado,p.estado_entrega),archivado:Boolean(p.archivado_en),busqueda:[numeroPedido(p.id,p.referencia_numero),numeroPedido(p.id),p.cliente.nombre,p.cliente.apellidos,p.cliente.correo,p.cliente.telefono,...p.articulos.map(x=>x.nombre)].join(' '),contenido:<article key={p.id} className="pedidos-admin-tarjeta"><details className="panel-pedido-detalle"><summary><div><strong>{p.cliente.nombre} {p.cliente.apellidos}</strong><small>{numero} · {fecha(p.creado_en)}</small>{p.archivado_en&&<span className="pedido-archivo-etiqueta">{archivoT('estadoArchivado')}</span>}</div><div><small>{t(`metodo_${p.metodo}`)}</small><EstadosPedidoAdmin key="estados" pago={p.estado} entrega={p.estado_entrega}/></div><span>{t(`modalidad_${modalidad(p.cliente?.modalidad)}`)}</span><strong>{colones(total)}</strong></summary>
          <DetallePedido
           resumen={<><dl className="pedido-detalle-datos">{dato(reales('numero'),<code>{numero}</code>)}{dato(reales('creado'),fecha(p.creado_en))}{dato(propuesta('formaPago'),t(`metodo_${p.metodo}`))}{dato(propuesta('entrega'),t(`modalidad_${modalidad(p.cliente?.modalidad)}`))}{dato(propuesta('total'),colones(total))}</dl>{p.inventario_alerta&&<div role="alert" className="panel-aviso"><p>{reales('inventarioAlerta')}</p><form action={resolverInventarioPedido}><input type="hidden" name="id" value={p.id}/><input type="hidden" name="tipo" value="manual"/><button className="boton boton-contorno">{reales('resolverInventario')}</button></form></div>}</>}
           productos={<><h3>{propuesta('productos')}</h3><ul>{p.articulos?.map((item, index) => <li key={index}>{item.cantidad} × {item.nombre}</li>)}</ul><div className="pedidos-admin-pie"><code>{numero}</code><strong>{colones(total)}</strong></div>{p.cliente?.modalidad==='express'?<p>{t('expressSeparado')}</p>:envio !== null && <p>{t('costoEnvio')}: {colones(envio)}</p>}{p.estado === 'revision' && <p>{t('subtotalPendiente')}</p>}</>}
           cliente={<ContactoPedidoAdmin key="contacto" cliente={p.cliente} pagoPendiente={['revision','pendiente_pago'].includes(p.estado)} referencia={numero}/>}
           principal={[
            p.estado === 'revision' && <form action={actualizarPedidoManual} className="pedido-admin-form"><input type="hidden" name="id" value={p.id}/><input type="hidden" name="estado" value="pendiente_pago"/><button className="boton boton-azul">{t('confirmarYEnviar')}</button></form>,
            (p.estado === 'pendiente_pago' || p.estado === 'comprobante_recibido') && <div className="pedido-admin-form">{p.comprobante_path&&<p><a href={`/panel/pedidos/comprobante/${p.id}`} target="_blank" rel="noopener noreferrer">{t('verComprobante')} <span className="sr-only">{t('nuevaPestana')}</span></a></p>}<p>{t('verificarBanco')}</p><ConfirmarAccionPedido accion={actualizarPedidoManual} campos={{id:p.id,estado:'pagado'}} principal boton={t('marcarPagado')} titulo={reales('pagadoTitulo',{referencia:numero})} descripcion={t('verificarBanco')} detalles={[reales('pagadoCorreo'),reales('pagadoPreparar'),reales('pagadoIrreversible')]} confirmar={t('marcarPagado')}/></div>,
            p.estado==='pagado'&&p.comprobante_path&&<p><a href={`/panel/pedidos/comprobante/${p.id}`} target="_blank" rel="noopener noreferrer">{t('verComprobante')} <span className="sr-only">{t('nuevaPestana')}</span></a></p>,
            <GestionEntregaPedido key="gestion" id={p.id} tipo="manual" pago={p.estado} entrega={p.estado_entrega} modalidad={p.cliente?.modalidad}/>,
           ]}
           secundarias={[
            (!p.correo_cliente_en || p.estado === 'pendiente_pago' && !p.correo_pago_en) && <div className="panel-aviso"><p>{t('correoPendiente')}</p><label>{t('enlaceCliente')}<input readOnly value={enlace.href} aria-label={t('enlaceCliente')} /></label></div>,
            ['pendiente_pago','comprobante_recibido','pagado'].includes(p.estado)&&<form action={reenviarCorreoPedido}><input type="hidden" name="id" value={p.id}/><button className="boton boton-contorno">{t('reenviarCorreo')}</button></form>,
            p.estado==='pagado'&&<section className="panel-correo-info"><h3>{t('facturacionGti')}</h3><p>{t('facturacionGtiTexto')}</p><a className="boton boton-azul" href="https://www.facturaelectronica.cr/" target="_blank" rel="noopener noreferrer">{t('abrirGti')}<span className="sr-only">{t('nuevaPestana')}</span></a></section>,
           ]}
           cierre={[
            activo && <ConfirmarAccionPedido accion={actualizarPedidoManual} campos={{id:p.id,estado:'cancelado'}} boton={t('cancelar')} titulo={reales('cancelarTitulo',{referencia:numero})} descripcion={reales('cancelarDescripcion')} detalles={[reales('cancelarInventario'),reales('cancelarSinCorreo'),reales('cancelarIrreversible')]} confirmar={t('cancelar')} peligro/>,
            !p.archivado_en&&!puedeArchivar('manual',p)&&notaArchivo(motivoNoArchivable('manual',p)),
            (p.archivado_en||puedeArchivar('manual',p))&&<ArchivoPanel id={p.id} tipo="manual" referencia={numero} archivado={Boolean(p.archivado_en)} motivo={p.archivado_motivo}/>,
           ]}/>
        </details></article>};
      });
  const tarjetaItems:ItemPedidoReal[]=pedidos.map(pedido => {
        const numero=numeroPedido(pedido.id,pedido.referencia_numero);
        const seguimiento=pedido.aviso_intento_estado==='incierto';
        return {id:pedido.id,tipo:'tarjeta',metodo:'tarjeta',modalidad:pedido.cliente?.modalidad??'retiro',fecha:pedido.creado_en,pago:pedido.estado,seguimiento,estado:estadoGestion(pedido.estado,pedido.estado_entrega),archivado:Boolean(pedido.archivado_en),busqueda:[numeroPedido(pedido.id,pedido.referencia_numero),numeroPedido(pedido.id),pedido.id,pedido.cliente.nombre,pedido.cliente.apellidos,pedido.cliente.correo,...pedido.articulos.map(x=>x.nombre)].join(' '),contenido:<article key={pedido.id} className="pedidos-admin-tarjeta"><details className="panel-pedido-detalle"><summary><div><strong>{pedido.cliente.nombre} {pedido.cliente.apellidos}</strong><small>{numero} · {fecha(pedido.creado_en)} · {t(pedido.entorno)}</small>{pedido.archivado_en&&<span className="pedido-archivo-etiqueta">{archivoT('estadoArchivado')}</span>}</div><div><small>{propuesta('metodo_tarjeta')}</small><EstadosPedidoAdmin key="estados" pago={pedido.estado} entrega={pedido.estado_entrega}/>{seguimiento&&<span className="panel-chip" data-tono="peligro">{reales('seguimiento')}</span>}</div><span>{t(`modalidad_${modalidad(pedido.cliente?.modalidad)}`)}</span><strong>{colones(pedido.total)}</strong></summary>
          <DetallePedido
           resumen={<><dl className="pedido-detalle-datos">{dato(reales('numero'),<code>{numero}</code>)}{dato(reales('creado'),fecha(pedido.creado_en))}{dato(propuesta('formaPago'),propuesta('metodo_tarjeta'))}{dato(propuesta('entrega'),t(`modalidad_${modalidad(pedido.cliente?.modalidad)}`))}{dato(propuesta('total'),colones(pedido.total))}{dato(reales('ambiente'),t(pedido.entorno))}</dl>{pedido.inventario_alerta&&<div role="alert" className="panel-aviso"><p>{reales('inventarioAlerta')}</p><form action={resolverInventarioPedido}><input type="hidden" name="id" value={pedido.id}/><input type="hidden" name="tipo" value="tarjeta"/><button className="boton boton-contorno">{reales('resolverInventario')}</button></form></div>}{seguimiento&&<p role="status" className="panel-aviso">{t('avisoIntentoIncierto')}</p>}{pedido.estado==='rechazado'&&<p><strong>{t('motivoTilopay')}:</strong> {pedido.resultado_tilopay?.trim()||t('motivoNoInformado')}</p>}</>}
           productos={<><h3>{propuesta('productos')}</h3><ul>{pedido.articulos?.map((item, index) => <li key={index}>{item.cantidad} × {item.nombre}</li>)}</ul><div className="pedidos-admin-pie"><code>{numero}</code><strong>{colones(pedido.total)}</strong></div>{pedido.cliente?.modalidad==='express'&&<p>{t('expressSeparado')}</p>}</>}
           cliente={<ContactoPedidoAdmin key="contacto" cliente={pedido.cliente} pagoPendiente={['iniciado','pendiente','rechazado','error'].includes(pedido.estado)} referencia={numero}/>}
           principal={[<GestionEntregaPedido key="gestion" id={pedido.id} tipo="tarjeta" pago={pedido.estado} entrega={pedido.estado_entrega} modalidad={pedido.cliente?.modalidad}/>]}
           cierre={[
            !pedido.archivado_en&&!puedeArchivar('tarjeta',pedido)&&notaArchivo(motivoNoArchivable('tarjeta',pedido)),
            (pedido.archivado_en||puedeArchivar('tarjeta',pedido))&&<ArchivoPanel id={pedido.id} tipo="tarjeta" referencia={numero} archivado={Boolean(pedido.archivado_en)} motivo={pedido.archivado_motivo}/>,
           ]}/>
        </details></article>};
      });
  const resultadosPedido=['guardado','sin_correo','error','invalido','no_disponible','enlace_generado','asesoria_cancelada','consulta_eliminada'];
  const resultadosReales=['pagado','pagado_sin_correo','pagado_sin_medicion','cancelado','inventario_resuelto','inventario_pendiente','inventario_error'];
  const alertas=['error','invalido','no_disponible','pagado_sin_correo','inventario_pendiente','inventario_error'];
  const avisos=<>
    {resultado && resultadosPedido.includes(resultado) && <p role={alertas.includes(resultado)?'alert':'status'} className="panel-aviso">{t(`resultado_${resultado}`)}</p>}
    {resultado && resultadosReales.includes(resultado) && <p role={alertas.includes(resultado)?'alert':'status'} className="panel-aviso">{reales(`resultado_${resultado}`)}</p>}
    {resultado==='entrega_conflicto'&&<p role="alert" className="panel-aviso">{entregaT('conflicto')}</p>}
    {resultado==='entrega_guardada'&&<p role="status" className="panel-aviso">{entregaT('guardado')}</p>}
    {['archivado','restaurado','archivo_conflicto'].includes(resultado??'')&&<p role={resultado==='archivo_conflicto'?'alert':'status'} className="panel-aviso">{archivoT(resultado==='archivo_conflicto'?'conflicto':resultado!)}</p>}
    {errorAsesorias&&<p role="alert" className="panel-aviso">{a('noDisponible')}</p>}
    {(!manualDb||manualError)&&<p role="alert" className="panel-aviso">{t('configurarManual')}</p>}
    {(!db||error)&&<p role="alert" className="panel-aviso">{t('configurar')}</p>}
  </>;
  return <main id="contenido" className="contenedor seccion panel-pedidos-ordenados pedidos-reales">
    <BandejaPedidosReales items={[...asesoriaItems,...manualItems,...tarjetaItems]} destacado={pedidoDestacado??destacada} encabezado={{seccion:panelT('operaciones'),titulo:t('titulo'),descripcion:reales('descripcion')}} avisos={avisos} crear={<PrepararAsesoria id="" articulos={[]} productos={productos}/>}/>
  </main>;
}
