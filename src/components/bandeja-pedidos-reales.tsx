'use client';
import {Children,useEffect,useId,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {Search,X,Plus} from 'lucide-react';
import {SelectorMenu} from './selector-menu';
import {EncabezadoPanel} from './encabezado-panel';
export type ItemPedidoReal={id:string;tipo:string;estado:string;archivado?:boolean;pago?:string;vencida?:boolean;seguimiento?:boolean;metodo:string;modalidad:string;fecha:string;busqueda:string;contenido:ReactNode};
/** Stage = who acts next: SG (por_atender) or the customer (esperando_cliente); expired purchase links leave the work queue. */
export function etapaPedido(p:Pick<ItemPedidoReal,'estado'|'archivado'> & Partial<Pick<ItemPedidoReal,'tipo'|'pago'|'vencida'>>){
 if(p.archivado)return 'archivados';
 if(p.tipo==='tarjeta'&&p.pago!=='pagado')return 'intentos';
 if(['preparando','listo_retiro'].includes(p.estado))return 'preparacion';
 if(p.vencida||['enviado','entregado','cancelado','utilizada','cancelada'].includes(p.estado))return 'finalizados';
 if(p.tipo==='asesoria'?['aprobada','procesando'].includes(p.estado):p.pago==='pendiente_pago')return 'esperando_cliente';
 return 'por_atender';
}
const suscribir=()=>()=>{};
const listoCliente=()=>true;
const listoServidor=()=>false;
const etapas=['por_atender','esperando_cliente','preparacion','finalizados','intentos','archivados'];
const metodos=['todos','sinpe','transferencia','tarjeta','enlace'],entregas=['todos','retiro','envio','express','digital'],ordenesValidos=['antiguos','recientes'];
const PAGOS:Record<string,string[]>={por_verificar:['revision','comprobante_recibido'],pendiente:['revision','pendiente_pago','comprobante_recibido','iniciado','pendiente'],confirmado:['pagado'],problema:['rechazado','error']};
/** Payment filters never match purchase-link consultations: they have no payment of their own. */
const coincidePago=(p:ItemPedidoReal,pago:string)=>pago==='todos'||p.tipo!=='asesoria'&&(Boolean(PAGOS[pago]?.includes(p.pago??''))||pago==='problema'&&Boolean(p.seguimiento));
const normalizar=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLocaleLowerCase();

// Filters survive the remount caused by every server action redirect (client navigation keeps this module), while a fresh page load starts from the default view.
type Filtros={vista?:string;buscar:string;metodo:string;entrega:string;pago:string;ordenes:Record<string,string>};
const inicial:Filtros={buscar:'',metodo:'todos',entrega:'todos',pago:'todos',ordenes:{}};
let memoria:Filtros|null=null;
const oyentes=new Set<()=>void>();
function leerFiltros():Filtros{
 return memoria??=inicial;
}
function escribirFiltros(cambio:Partial<Filtros>){
 memoria={...leerFiltros(),...cambio};
 oyentes.forEach(f=>f());
}
const suscribirFiltros=(f:()=>void)=>{oyentes.add(f);return()=>{oyentes.delete(f);};};
const filtrosServidor=()=>inicial;

export function BandejaPedidosReales({items,crear,destacado,encabezado,avisos}:{items:ItemPedidoReal[];crear:ReactNode;destacado?:string;encabezado:{seccion:string;titulo:string;descripcion:string};avisos?:ReactNode}){
 const t=useTranslations('PropuestaPedidos'),r=useTranslations('PedidosReales'),l=useTranslations('PanelLista');
 const listo=useSyncExternalStore(suscribir,listoCliente,listoServidor),idCrear=useId();
 const filtros=useSyncExternalStore(suscribirFiltros,leerFiltros,filtrosServidor);
 const destino=items.find(p=>p.id===destacado);
 const vista=filtros.vista??(destino?etapaPedido(destino):'por_atender');
 const {buscar,metodo,entrega,pago}=filtros;
 const [limite,setLimite]=useState(destacado?items.length:20),[creando,setCreando]=useState(false),[avisoCerrado,setAvisoCerrado]=useState(false);
 const raiz=useRef<HTMLDivElement>(null),nuevo=useRef<HTMLElement>(null),atendido=useRef<string|undefined>(undefined),enfocado=useRef<string|undefined>(undefined);
 const cambiar=(cambio:Partial<Filtros>)=>{escribirFiltros(cambio);setLimite(20);setAvisoCerrado(true);};
 useEffect(()=>{const barra=raiz.current?.querySelector<HTMLElement>('.pedidos-reales-vistas');if(barra&&barra.scrollWidth>barra.clientWidth)barra.querySelector<HTMLElement>('[aria-pressed=true]')?.scrollIntoView({block:'nearest',inline:'center'});},[vista]);
 const orden=filtros.ordenes[vista]??(['finalizados','archivados'].includes(vista)?'recientes':'antiguos');
 const filtrados=items.filter(p=>etapaPedido(p)===vista&&(metodo==='todos'||p.metodo===metodo)&&(entrega==='todos'||p.modalidad===entrega)&&coincidePago(p,pago)&&normalizar(p.busqueda).includes(normalizar(buscar.trim()))).sort((a,b)=>(orden==='antiguos'?1:-1)*(Date.parse(a.fecha)-Date.parse(b.fecha))||a.id.localeCompare(b.id));
 const destinoVisible=Boolean(destacado&&filtrados.slice(0,limite).some(p=>p.id===destacado));
 // The requested order (a link, or the order just changed by an action) opens its current stage; search and other filters are kept.
 const etapaDestino=destino?destino.id+':'+etapaPedido(destino):'';
 useEffect(()=>{if(!destino||atendido.current===etapaDestino)return;atendido.current=etapaDestino;escribirFiltros({vista:etapaPedido(destino)});},[destino,etapaDestino]);
 useEffect(()=>{
  if(!destacado||!destinoVisible||enfocado.current===destacado)return;
  enfocado.current=destacado;
  // Never steal focus from an open confirmation dialog (a late action redirect would otherwise close it).
  if(document.querySelector('[role=dialog],[role=alertdialog]'))return;
  const elemento=raiz.current?.querySelector<HTMLElement>(`[data-pedido="${CSS.escape(destacado)}"]`);
  const detalle=elemento?.querySelector('details');if(detalle)detalle.open=true;
  const frame=requestAnimationFrame(()=>{const summary=detalle?.querySelector('summary');summary?.focus({preventScroll:true});summary?.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
  return()=>cancelAnimationFrame(frame);
 },[destacado,destinoVisible]);
 const hayFiltros=Boolean(buscar||metodo!=='todos'||entrega!=='todos'||pago!=='todos');
 function limpiar(){cambiar({buscar:'',metodo:'todos',entrega:'todos',pago:'todos'});}
 function mostrarDestino(){if(!destino)return;escribirFiltros({vista:etapaPedido(destino),buscar:'',metodo:'todos',entrega:'todos',pago:'todos'});setLimite(items.length);enfocado.current=undefined;}
 function alternarCrear(){const abrir=!creando;setCreando(abrir);if(abrir)requestAnimationFrame(()=>nuevo.current?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));}
 const activos=items.filter(p=>!p.archivado),contar=(v:string)=>items.filter(p=>etapaPedido(p)===v).length;
 const resumen=[
  {id:'verificar',tono:'info',cantidad:activos.filter(p=>p.tipo==='manual'&&coincidePago(p,'por_verificar')).length,vista:'por_atender',pago:'por_verificar'},
  {id:'preparar',tono:'aviso',cantidad:activos.filter(p=>p.pago==='pagado'&&p.estado==='pendiente_preparar').length,vista:'por_atender',pago:'confirmado'},
  {id:'curso',tono:'info',cantidad:contar('preparacion'),vista:'preparacion',pago:'todos'},
  {id:'cliente',tono:'neutro',cantidad:contar('esperando_cliente'),vista:'esperando_cliente',pago:'todos'},
  {id:'tarjeta',tono:'peligro',cantidad:activos.filter(p=>p.tipo==='tarjeta'&&p.pago!=='pagado'&&coincidePago(p,'problema')).length,vista:'intentos',pago:'problema'},
 ];
 return <div className="pedidos-reales-modulo" ref={raiz}>
  <EncabezadoPanel seccion={encabezado.seccion} titulo={encabezado.titulo} descripcion={encabezado.descripcion} acciones={<button className="boton boton-azul" type="button" disabled={!listo} aria-expanded={creando} aria-controls={idCrear} onClick={alternarCrear}><Plus size={17} aria-hidden="true"/>{r('crear')}</button>}/>
  {avisos}
  <ul className="panel-resumen pedidos-resumen" aria-label={r('resumenTitulo')}>{resumen.map(k=>{const activo=vista===k.vista&&pago===k.pago&&!buscar&&metodo==='todos'&&entrega==='todos';return <li key={k.id} data-tono={k.cantidad?k.tono:'neutro'}><button type="button" aria-pressed={activo} disabled={!listo} onClick={()=>cambiar({vista:k.vista,pago:k.pago,buscar:'',metodo:'todos',entrega:'todos'})}><span>{r(`resumen_${k.id}`)}</span><strong>{k.cantidad}</strong></button></li>;})}</ul>
  <section className="panel-nueva-asesoria" id={idCrear} ref={nuevo} hidden={!creando} aria-label={r('crear')}>{Children.toArray(crear)}</section>
  <div className="pedidos-reales-bandeja panel-pedidos-seccion">
  <div className="pedidos-reales-herramientas"><label className="panel-buscador"><Search size={18} aria-hidden="true"/><span className="sr-only">{t('buscar')}</span><input disabled={!listo} type="search" placeholder={t('buscar')} value={buscar} onChange={e=>cambiar({buscar:e.target.value})}/></label></div>
  <div className="pedidos-reales-cabecera"><div className="panel-lista-vistas pedidos-reales-vistas" role="group" aria-label={t('estadoPedido')}>{etapas.map(v=><button key={v} type="button" aria-pressed={vista===v} disabled={!listo} onClick={()=>cambiar({vista:v})}>{v==='esperando_cliente'?r('esperandoCliente'):t(v)}<span>{contar(v)}</span></button>)}</div></div>
  <div className="pedidos-reales-filtros">
   <div><span>{t('formaPago')}</span><SelectorMenu etiqueta={t('formaPago')} valor={metodo} cambiar={v=>cambiar({metodo:v})} opciones={metodos.map(v=>({valor:v,texto:v==='enlace'?r('enlace'):t(`metodo_${v}`)}))}/></div>
   <div><span>{t('entrega')}</span><SelectorMenu etiqueta={t('entrega')} valor={entrega} cambiar={v=>cambiar({entrega:v})} opciones={entregas.map(v=>({valor:v,texto:t(`entrega_${v}`)}))}/></div>
   <div><span>{l('estadoPago')}</span><SelectorMenu etiqueta={l('estadoPago')} valor={pago} cambiar={v=>cambiar({pago:v})} opciones={[{valor:'todos',texto:l('todos')},{valor:'por_verificar',texto:r('pago_por_verificar')},{valor:'pendiente',texto:l('pagoPendiente')},{valor:'confirmado',texto:l('pagoConfirmado')},{valor:'problema',texto:r('pago_problema')}]}/></div>
   <div><span>{t('ordenar')}</span><SelectorMenu etiqueta={t('ordenFecha')} valor={orden} cambiar={v=>cambiar({ordenes:{...filtros.ordenes,[vista]:v}})} opciones={ordenesValidos.map(v=>({valor:v,texto:t(v)}))}/></div>
  </div>
  {destino&&!destinoVisible&&!avisoCerrado&&<div className="panel-aviso pedidos-reales-movido" role="status"><p>{r('destinoOculto',{etapa:etapaPedido(destino)==='esperando_cliente'?r('esperandoCliente'):t(etapaPedido(destino))})}</p><button type="button" className="boton boton-contorno" onClick={mostrarDestino}>{r('mostrarDestino')}</button></div>}
  <div className="pedidos-reales-resultados"><p className="solo-lectores" role="status">{t('resultados',{cantidad:filtrados.length})}</p>{hayFiltros&&<button type="button" onClick={limpiar}><X size={14} aria-hidden="true"/>{t('limpiar')}</button>}</div>
  <div className="pedidos-reales-columnas" aria-hidden="true"><span>{t('clientePedido')}</span><span>{t('pago')}</span><span>{t('entrega')}</span><span>{t('total')}</span><span/></div>
  <div className="pedidos-admin-lista">{filtrados.slice(0,limite).map(p=><div key={p.tipo+'-'+p.id} data-pedido={p.id}>{Children.toArray(p.contenido)}</div>)}</div>
  {!filtrados.length&&<div className="panel-vacio pedidos-reales-vacio"><Search size={28} aria-hidden="true"/><h2>{hayFiltros?t('vacio'):r('vacioEtapa')}</h2><p>{hayFiltros?t('vacioAyuda'):r('vacioEtapaAyuda')}</p>{hayFiltros&&<button type="button" className="boton boton-contorno" onClick={limpiar}>{t('limpiar')}</button>}</div>}
  {filtrados.length>limite&&<button type="button" className="boton boton-contorno pedidos-reales-mas" onClick={()=>setLimite(n=>n+20)}>{t('cargarMas',{cantidad:filtrados.length-limite})}</button>}
  </div>
 </div>;
}
