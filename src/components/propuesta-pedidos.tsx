'use client';

import {ComprobantePrueba} from './comprobante-prueba';
import {useState,useEffect,useRef} from 'react';
import Link from 'next/link';
import {CrearEnlacePrueba,AccionesEnlacePrueba} from './crear-enlace-prueba';
import {useEnlacesPrueba} from './enlaces-prueba-store';
import {pedidoDesdeEnlace} from '@/lib/disponibilidad-prueba';
import {NavegacionPropuesta,ModulosPropuesta,type ModuloPropuesta} from './propuesta-panel';
import Image from 'next/image';
import {useLocale,useTranslations} from 'next-intl';
import {Archive,ArrowLeft,ArrowRight,Check,ChevronDown,ClipboardCheck,CreditCard,Landmark,Package,RotateCcw,Search,Smartphone,Store,Truck,X} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import {MarcoModal} from './marco-modal';
import {SelectorMenu} from './selector-menu';
import {pagoPedidoPropuesta,pedidosPropuesta,vistaPedidoPropuesta,type PedidoPropuesta,type EstadoPropuesta,type VistaPropuesta} from '@/lib/pedidos-propuesta';

const vistas:VistaPropuesta[]=['por_atender','preparacion','finalizados'];
const iconosPago={sinpe:Smartphone,transferencia:Landmark,tarjeta:CreditCard};
const iconosEntrega={retiro:Store,envio:Package,express:Truck};
const normalizar=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();

export function PropuestaPedidos({fechas,importes}:{fechas:Record<string,string>;importes:Record<number,string>}){
 const [modulo,setModulo]=useState<ModuloPropuesta>('pedidos'),[reinicio,setReinicio]=useState(0),[limite,setLimite]=useState(20);
 const t=useTranslations('PropuestaPedidos'),n=useTranslations('Navegacion'),locale=useLocale();
 const [pedidosBase,setPedidos]=useState(pedidosPropuesta);
 const {enlaces,guardar,listo}=useEnlacesPrueba();
 const pedidos=[...enlaces.map(pedidoDesdeEnlace),...pedidosBase];
 const d=useTranslations('DisponibilidadPrueba');
 const [vista,setVista]=useState<VistaPropuesta>('por_atender'),[buscar,setBuscar]=useState(''),[metodo,setMetodo]=useState('todos'),[entrega,setEntrega]=useState('todos');
 const [archivados,setArchivados]=useState(false),[abierto,setAbierto]=useState<string|null>(null),[aviso,setAviso]=useState('');
 const [confirmar,setConfirmar]=useState<PedidoPropuesta|null>(null);
 const [guias,setGuias]=useState<Record<string,string>>({});
 const destino=useRef<string|null>(null);
 const [ordenes,setOrdenes]=useState<Record<string,string>>({});
 const grupo=archivados?'archivados':vista;
 const orden=ordenes[grupo]??(archivados||vista==='finalizados'?'recientes':'antiguos');
 const dinero=(valor:number)=>importes[valor]??new Intl.NumberFormat(locale==='en'?'en-US':'es-CR',{style:'currency',currency:'CRC',maximumFractionDigits:0}).format(valor);
 const fecha=(valor:string)=>fechas[valor]??new Intl.DateTimeFormat(locale==='en'?'en-US':'es-CR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Costa_Rica'}).format(new Date(valor));
 const coincidencias=pedidos.filter(p=>(metodo==='todos'||!p.sinModalidad&&p.metodo===metodo)&&(entrega==='todos'||!p.sinModalidad&&p.entrega===entrega)&&normalizar([p.id,p.cliente,...(p.lineas??[{producto:p.producto}]).map(l=>t('producto_'+l.producto))].join(' ')).includes(normalizar(buscar.trim())));
 const contadores=pedidos.reduce((totales,p)=>{totales[p.archivado?'archivados':vistaPedidoPropuesta(p.estado)]++;return totales;},{por_atender:0,preparacion:0,finalizados:0,archivados:0});
 const base=coincidencias.filter(p=>Boolean(p.archivado)===archivados);
 const visibles=base.filter(p=>(archivados||vistaPedidoPropuesta(p.estado)===vista)).sort((a,b)=>{const diferencia=Date.parse(a.fecha)-Date.parse(b.fecha);return (orden==='antiguos'?diferencia:-diferencia)||a.id.localeCompare(b.id);});
 useEffect(()=>{
  if(!destino.current)return;
  const elemento=document.querySelector<HTMLElement>('[data-pedido="'+CSS.escape(destino.current)+'"] summary');
  if(!elemento)return;
  destino.current=null;
  const frame=requestAnimationFrame(()=>{elemento.focus({preventScroll:true});elemento.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
  return()=>cancelAnimationFrame(frame);
 });
 function irAlPedido(p:PedidoPropuesta){
  destino.current=p.id;setArchivados(Boolean(p.archivado));setVista(vistaPedidoPropuesta(p.estado));setAbierto(p.id);
  setLimite(pedidos.length+1);
 }
 function actualizar(p:PedidoPropuesta,estado:EstadoPropuesta){const guia=(guias[p.id]??p.guia??'').trim();if(p.enlaceToken){guardar(enlaces.map(e=>e.token===p.enlaceToken?{...e,estado,guia}:e));}else setPedidos(actual=>actual.map(x=>x.id===p.id?{...x,estado,guia}:x));setAviso(t('simulado',{referencia:p.id,estado:t(`estado_${estado}`)}));setConfirmar(null);irAlPedido({...p,estado});}
 function guardarGuia(p:PedidoPropuesta){const guia=(guias[p.id]??p.guia??'').trim();if(p.enlaceToken)guardar(enlaces.map(e=>e.token===p.enlaceToken?{...e,guia}:e));else setPedidos(actual=>actual.map(x=>x.id===p.id?{...x,guia}:x));setAviso(t('guiaGuardada',{referencia:p.id}));}
 function limpiar(){setBuscar('');setMetodo('todos');setEntrega('todos');setLimite(20);}
 function restablecer(){setGuias({});guardar([]);setOrdenes({});setReinicio(n=>n+1);setPedidos(pedidosPropuesta);setVista('por_atender');setArchivados(false);setAbierto(null);setAviso('');limpiar();}
 function siguiente(p:PedidoPropuesta){
  if(p.estado==='comprobante'){setConfirmar(p);return;}
  if(p.estado==='por_preparar')actualizar(p,'preparando');
  if(p.estado==='preparando')actualizar(p,p.entrega==='retiro'?'listo_retiro':'enviado');
  if(p.estado==='listo_retiro'||p.estado==='enviado')actualizar(p,'entregado');
 }
 function accion(p:PedidoPropuesta){
  if(p.estado==='comprobante')return 'verificarPago';
  if(p.estado==='por_preparar')return 'preparar';
  if(p.estado==='preparando')return p.entrega==='retiro'?'listoRetiro':'marcarEnviado';
  if(p.estado==='listo_retiro'||p.estado==='enviado')return 'confirmarEntrega';
  return null;
 }
 return <div className="pedidos-propuesta">
  <div className="propuesta-franja"><span><span className="propuesta-punto"/>{t('vistaLocal')}</span><button type="button" onClick={restablecer}><RotateCcw size={14} aria-hidden="true"/>{t('restablecer')}</button></div>
  <header className="propuesta-cabecera-panel"><div className="propuesta-cabecera-fila"><Link className="propuesta-logo-sitio" href="/" aria-label={n('inicio')}><Image src="/imagenes/logo-principal.png" alt={t('logo')} width={132} height={55} priority/></Link><NavegacionPropuesta modulo={modulo} cambiar={setModulo}/><Link className="propuesta-volver-sitio" href="/"><ArrowLeft size={18} aria-hidden="true"/>{t('volverSitio')}</Link></div></header>
  <div hidden={modulo==='pedidos'}><ModulosPropuesta key={reinicio} modulo={modulo} cambiar={setModulo} total={pedidos.filter(p=>!p.archivado).length} pendientes={pedidos.filter(p=>!p.archivado&&vistaPedidoPropuesta(p.estado)==='por_atender').length}/></div>
  <main id={modulo==='pedidos'?'contenido':undefined} hidden={modulo!=='pedidos'} className="propuesta-contenido">
   <h1 className="sr-only">{t('titulo')}</h1>
   <section className="propuesta-bandeja" aria-label={t('pedidos')}>
     <div className="propuesta-bandeja-cabecera"><div className="propuesta-vistas" role="group" aria-label={t('estadoPedido')}>{vistas.map(v=><button key={v} aria-pressed={!archivados&&vista===v} onClick={()=>{setArchivados(false);setVista(v);setLimite(20);setAbierto(null);setAviso('');}}>{t(v)}<span>{listo?contadores[v]:'—'}</span></button>)}<button data-vista="archivados" aria-pressed={archivados} onClick={()=>{setArchivados(true);setLimite(20);setAbierto(null);setAviso('');}}>{t('archivados')}<span>{listo?contadores.archivados:'—'}</span></button></div>
     <div className="disponibilidad-admin-toolbar"><CrearEnlacePrueba alCrear={id=>{limpiar();setArchivados(false);setVista('por_atender');setBuscar(id);setAbierto(id);}}/></div></div>
     {archivados&&<p className="propuesta-archivo-ayuda">{t('archivoAyuda')}</p>}
     <div className="propuesta-herramientas">
      <label className="propuesta-buscar"><Search size={18} aria-hidden="true"/><span className="sr-only">{t('buscar')}</span><input disabled={!listo} type="search" placeholder={t('buscar')} value={buscar} onChange={e=>setBuscar(e.target.value)}/></label>
      <div className="propuesta-filtro"><span>{t('formaPago')}</span><SelectorMenu etiqueta={t('formaPago')} valor={metodo} cambiar={setMetodo} opciones={['todos','sinpe','transferencia','tarjeta'].map(v=>({valor:v,texto:t(`metodo_${v}`)}))}/></div>
      <div className="propuesta-filtro"><span>{t('entrega')}</span><SelectorMenu etiqueta={t('entrega')} valor={entrega} cambiar={setEntrega} opciones={['todos','retiro','envio','express'].map(v=>({valor:v,texto:t(`entrega_${v}`)}))}/></div>
      <div className="propuesta-filtro propuesta-orden-fecha"><span>{t('ordenar')}</span><SelectorMenu etiqueta={t('ordenFecha')} valor={orden} cambiar={valor=>{setOrdenes(actual=>({...actual,[grupo]:valor}));setLimite(20);}} opciones={['antiguos','recientes'].map(valor=>({valor,texto:t(valor)}))}/></div>
     </div>
     <div className="propuesta-resultados"><p role="status">{t('resultados',{cantidad:visibles.length})}</p>{(buscar||metodo!=='todos'||entrega!=='todos')&&<button onClick={limpiar}><X size={14} aria-hidden="true"/>{t('limpiar')}</button>}</div>
     {aviso&&<p role="status" className="propuesta-aviso"><Check size={16} aria-hidden="true"/>{aviso}</p>}
     <div className="propuesta-columnas" aria-hidden="true"><span>{t('clientePedido')}</span><span>{t('pago')}</span><span>{t('entrega')}</span><span>{t('total')}</span><span/></div>
     <div className="propuesta-listado">{visibles.slice(0,limite).map(p=>{
      const PagoIcono=iconosPago[p.metodo],EntregaIcono=iconosEntrega[p.entrega],pago=pagoPedidoPropuesta(p.estado),a=accion(p);
      const estadoEntrega=['comprobante','pendiente_pago','rechazado'].includes(p.estado)?'espera_pago':p.estado;
      return <article key={p.id} className="propuesta-pedido" data-pedido={p.id}>
       <details open={abierto===p.id}><summary onClick={e=>{e.preventDefault();setAbierto(abierto===p.id?null:p.id);}}>
        <div className="propuesta-cliente"><strong>{p.cliente}</strong><span><b>{p.id}</b><span aria-hidden="true"> · </span><time dateTime={p.fecha}>{fecha(p.fecha)}</time></span></div>
        <div className="propuesta-pago"><span className="propuesta-metodo" title={p.metodo==='tarjeta'?t('tarjetaAyuda'):undefined}><PagoIcono size={15} aria-hidden="true"/>{p.sinModalidad?d('porElegir'):t(`metodo_${p.metodo}`)}</span><span className={`propuesta-estado estado-${pago}`}>{pago==='confirmado'&&<Check size={12} aria-hidden="true"/>}{t(`pago_${pago}`)}</span></div>
        <div className="propuesta-entrega"><span className="propuesta-metodo"><EntregaIcono size={15} aria-hidden="true"/>{p.sinModalidad?d('entregaPorElegir'):t(`entrega_${p.entrega}`)}</span><span className={`propuesta-estado entrega-${estadoEntrega}`}>{t(`estado_${estadoEntrega}`)}</span></div>
        <strong className="propuesta-total">{dinero(p.total)}</strong><ChevronDown className="propuesta-chevron" size={17} aria-hidden="true"/>
       </summary>
       <div className="propuesta-detalle"><ComprobantePrueba pedido={p}/>{p.enlaceToken&&<AccionesEnlacePrueba token={p.enlaceToken} alCancelar={()=>actualizar(p,'cancelado')}/>}{p.estado==='rechazado'&&p.metodo==='tarjeta'&&<p className="propuesta-nota">{t('motivoTilopay')}: {t(p.id==='SG-1042'?'fondosEjemplo':'motivoNoInformado')}</p>}
        <div className={`propuesta-siguiente ${p.estado==='rechazado'?'propuesta-problema':''}`}><div><span>{t('siguientePaso')}</span><h3>{t(`paso_${p.estado}`)}</h3><p>{t(`ayuda_${p.estado}`)}</p></div>{!p.archivado&&a&&<button className="propuesta-principal" onClick={()=>siguiente(p)}>{t(a)}<ArrowRight size={16} aria-hidden="true"/></button>}</div>
        <div className="propuesta-detalle-grid"><section className="propuesta-detalle-productos"><h3>{t('productos')}</h3>{(p.lineas??[{producto:p.producto,cantidad:p.cantidad,precio:(p.total-(p.entrega==='envio'?4000:0))/p.cantidad}]).map(l=><div className="propuesta-producto" key={l.producto}><span>{l.cantidad}×</span><div><strong>{t('producto_'+l.producto)}</strong><small>{t('impuestoIncluido')}</small></div><strong>{dinero(l.precio*l.cantidad)}</strong></div>)}<dl className="propuesta-importes"><div><dt>{t('envio')}</dt><dd>{p.sinModalidad?d('entregaPorElegir'):p.entrega==='express'?t('seCotiza'):p.entrega==='envio'?dinero(4000):t('sinCosto')}</dd></div><div><dt>{t('total')}</dt><dd>{dinero(p.total)}</dd></div></dl></section><div className="propuesta-detalle-lateral"><section className="propuesta-detalle-contacto"><h3>{t('contacto')}</h3><p>{p.cliente}</p><p>{t('contactoEjemplo')}</p></section><section className="propuesta-detalle-entrega"><h3>{t('datosEntrega')}</h3><p><EntregaIcono size={16} aria-hidden="true"/>{p.sinModalidad?d('entregaPorElegir'):t(`entrega_${p.entrega}`)}</p><p>{p.sinModalidad?d('entregaEnEnlace'):t(p.entrega==='retiro'?'direccionTienda':'direccionEjemplo')}</p>{p.entrega==='express'&&<p className="propuesta-nota">{t('expressAyuda')}</p>}{!p.sinModalidad&&p.entrega!=='retiro'&&<form className="propuesta-guia" onSubmit={e=>{e.preventDefault();guardarGuia(p);}}><label htmlFor={'guia-'+p.id}>{t('numeroGuia')}</label><div><input id={'guia-'+p.id} name="guia" maxLength={100} value={guias[p.id]??p.guia??''} onChange={e=>setGuias(actual=>({...actual,[p.id]:e.target.value}))} readOnly={Boolean(p.archivado)} autoComplete="off"/>{!p.archivado&&<button type="submit">{t('guardarGuia')}</button>}</div><small>{t('guiaAyuda')}</small></form>}</section></div></div>
        <details className="propuesta-mas"><summary>{t('masDetalles')}<ChevronDown size={15} aria-hidden="true"/></summary><div className="propuesta-registro-detalles"><section><h4>{t('factura')}</h4><p>{t('facturaAyuda')}</p></section><section><h4>{t('historial')}</h4><p>{fecha(p.fecha)} · {t('pedidoRecibido')}</p><p>{t(`pago_${pago}`)} · {t(`metodo_${p.metodo}`)}</p></section></div></details>
        {!p.enlaceToken&&!p.archivado&&['pendiente_pago','rechazado'].includes(p.estado)&&<div className="propuesta-secundarias"><button onClick={()=>actualizar(p,p.metodo==='tarjeta'?'por_preparar':'comprobante')}>{t(p.metodo==='tarjeta'?'simularPago':'simularComprobante')}</button><button onClick={()=>actualizar(p,'cancelado')}>{t('cancelarEjemplo')}</button></div>}
        {(!p.enlaceToken&&(p.archivado||['entregado','cancelado','rechazado'].includes(p.estado)))&&<div className="propuesta-secundarias"><button onClick={()=>{setPedidos(actual=>actual.map(x=>x.id===p.id?{...x,archivado:!p.archivado}:x));setAviso(t(p.archivado?'restaurado':'archivado',{referencia:p.id}));irAlPedido({...p,archivado:!p.archivado});}}><Archive size={15} aria-hidden="true"/>{t(p.archivado?'restaurar':'archivar')}</button></div>}
       </div>
       </details>
      </article>;
     })}</div>
     {visibles.length>limite&&<button className="propuesta-cargar propuesta-archivo" onClick={()=>setLimite(n=>n+20)}>{t('cargarMas',{cantidad:visibles.length-limite})}</button>}
     {!visibles.length&&<div className="propuesta-vacio"><Search size={28} aria-hidden="true"/><h3>{t('vacio')}</h3><p>{t('vacioAyuda')}</p><button onClick={limpiar}>{t('limpiar')}</button></div>}
   </section>
  </main>
  <Dialog.Root open={Boolean(confirmar)} onOpenChange={open=>{if(!open)setConfirmar(null);}}><Dialog.Portal><Dialog.Overlay className="propuesta-modal-fondo"/><MarcoModal className="propuesta-modal"><Dialog.Title>{t('verificarPago')}</Dialog.Title><Dialog.Description>{t('verificarAyuda')}</Dialog.Description>{confirmar&&<><div className="propuesta-verificacion"><ClipboardCheck size={23} aria-hidden="true"/><div><strong>{confirmar.cliente}</strong><span>{confirmar.id} · {t(`metodo_${confirmar.metodo}`)}</span></div><strong>{dinero(confirmar.total)}</strong></div><ComprobantePrueba pedido={confirmar}/><p className="propuesta-nota">{t('verificarBanco')}</p><div className="propuesta-modal-acciones"><button onClick={()=>setConfirmar(null)}><ArrowLeft size={15} aria-hidden="true"/>{t('volver')}</button><button onClick={()=>actualizar(confirmar,'pendiente_pago')}>{t('devolverComprobante')}</button><button className="propuesta-principal" onClick={()=>actualizar(confirmar,'por_preparar')}><Check size={16} aria-hidden="true"/>{t('confirmarPago')}</button></div></>}</MarcoModal></Dialog.Portal></Dialog.Root>
 </div>;
}
