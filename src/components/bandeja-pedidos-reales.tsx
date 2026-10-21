'use client';
import {Children,useEffect,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {Search,X,Plus} from 'lucide-react';
import {SelectorMenu} from './selector-menu';
export type ItemPedidoReal={id:string;tipo:string;estado:string;archivado?:boolean;pago?:string;metodo:string;modalidad:string;fecha:string;busqueda:string;contenido:ReactNode};
export function etapaPedido(p:Pick<ItemPedidoReal,'estado'|'archivado'> & Partial<Pick<ItemPedidoReal,'tipo'|'pago'>>){return p.archivado?'archivados':p.tipo==='tarjeta'&&p.pago!=='pagado'?'intentos':['preparando','listo_retiro'].includes(p.estado)?'preparacion':['enviado','entregado','cancelado','utilizada','cancelada'].includes(p.estado)?'finalizados':'por_atender';}
const suscribir=()=>()=>{};
const listoCliente=()=>true;
const listoServidor=()=>false;
const etapas=['por_atender','preparacion','finalizados','intentos','archivados'];
const normalizar=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
export function BandejaPedidosReales({items,crear,destacado}:{items:ItemPedidoReal[];crear:ReactNode;destacado?:string}){
 const t=useTranslations('PropuestaPedidos'),r=useTranslations('PedidosReales'),l=useTranslations('PanelLista');
 const listo=useSyncExternalStore(suscribir,listoCliente,listoServidor);
 const destino=items.find(p=>p.id===destacado);
 const [vista,setVista]=useState(destino?etapaPedido(destino):'por_atender');
 const [buscar,setBuscar]=useState(''),[metodo,setMetodo]=useState('todos'),[entrega,setEntrega]=useState('todos'),[pago,setPago]=useState('todos');
 const [ordenes,setOrdenes]=useState<Record<string,string>>({}),[limite,setLimite]=useState(destacado?items.length:20);
 const raiz=useRef<HTMLDivElement>(null),nuevo=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const barra=raiz.current?.querySelector<HTMLElement>('.pedidos-reales-vistas');if(barra&&barra.scrollWidth>barra.clientWidth)barra.querySelector<HTMLElement>('[aria-pressed=true]')?.scrollIntoView({block:'nearest',inline:'center'});},[vista]);
 const orden=ordenes[vista]??(['finalizados','archivados'].includes(vista)?'recientes':'antiguos');
 const filtrados=items.filter(p=>etapaPedido(p)===vista&&(metodo==='todos'||p.metodo===metodo)&&(entrega==='todos'||p.modalidad===entrega)&&(pago==='todos'||(pago==='confirmado'?p.pago==='pagado':p.pago!=='pagado'))&&normalizar(p.busqueda).includes(normalizar(buscar.trim()))).sort((a,b)=>(orden==='antiguos'?1:-1)*(Date.parse(a.fecha)-Date.parse(b.fecha))||a.id.localeCompare(b.id));
 useEffect(()=>{
  if(!destacado)return;
  const elemento=raiz.current?.querySelector<HTMLElement>(`[data-pedido="${CSS.escape(destacado)}"]`);
  const detalle=elemento?.querySelector('details');if(detalle)detalle.open=true;
  const frame=requestAnimationFrame(()=>{const summary=detalle?.querySelector('summary');summary?.focus({preventScroll:true});summary?.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
  return()=>cancelAnimationFrame(frame);
 },[destacado]);
 function limpiar(){setBuscar('');setMetodo('todos');setEntrega('todos');setPago('todos');setLimite(20);}
 return <div className="pedidos-reales-bandeja panel-pedidos-seccion" ref={raiz}>
  <div className="pedidos-reales-herramientas"><label className="panel-buscador"><Search size={18} aria-hidden="true"/><span className="sr-only">{t('buscar')}</span><input disabled={!listo} type="search" placeholder={t('buscar')} value={buscar} onChange={e=>{setBuscar(e.target.value);setLimite(20);}}/></label><button className="boton boton-azul" type="button" onClick={()=>{if(nuevo.current){nuevo.current.open=!nuevo.current.open;if(nuevo.current.open)nuevo.current.scrollIntoView({block:'start'});}}}><Plus size={17} aria-hidden="true"/>{r('crear')}</button></div>
  <div className="pedidos-reales-cabecera"><div className="panel-lista-vistas pedidos-reales-vistas" role="group" aria-label={t('estadoPedido')}>{etapas.map(v=><button key={v} type="button" aria-pressed={vista===v} onClick={()=>{setVista(v);setLimite(20);}}>{t(v)}<span>{items.filter(p=>etapaPedido(p)===v).length}</span></button>)}</div></div>
  <details className="panel-nueva-asesoria" ref={nuevo}><summary>{r('crear')}</summary>{Children.toArray(crear)}</details>
  <div className="pedidos-reales-filtros">
   <div><span>{t('formaPago')}</span><SelectorMenu etiqueta={t('formaPago')} valor={metodo} cambiar={v=>{setMetodo(v);setLimite(20);}} opciones={['todos','sinpe','transferencia','tarjeta','enlace'].map(v=>({valor:v,texto:v==='enlace'?r('enlace'):t(`metodo_${v}`)}))}/></div>
   <div><span>{t('entrega')}</span><SelectorMenu etiqueta={t('entrega')} valor={entrega} cambiar={v=>{setEntrega(v);setLimite(20);}} opciones={['todos','retiro','envio','express','digital'].map(v=>({valor:v,texto:t(`entrega_${v}`)}))}/></div>
   <div><span>{l('estadoPago')}</span><SelectorMenu etiqueta={l('estadoPago')} valor={pago} cambiar={v=>{setPago(v);setLimite(20);}} opciones={[{valor:'todos',texto:l('todos')},{valor:'pendiente',texto:l('pagoPendiente')},{valor:'confirmado',texto:l('pagoConfirmado')}]}/></div>
   <div><span>{t('ordenar')}</span><SelectorMenu etiqueta={t('ordenFecha')} valor={orden} cambiar={v=>{setOrdenes(o=>({...o,[vista]:v}));setLimite(20);}} opciones={['antiguos','recientes'].map(v=>({valor:v,texto:t(v)}))}/></div>
  </div>
  <div className="pedidos-reales-resultados"><p className="solo-lectores" role="status">{t('resultados',{cantidad:filtrados.length})}</p>{(buscar||metodo!=='todos'||entrega!=='todos'||pago!=='todos')&&<button type="button" onClick={limpiar}><X size={14} aria-hidden="true"/>{t('limpiar')}</button>}</div>
  <div className="pedidos-reales-columnas" aria-hidden="true"><span>{t('clientePedido')}</span><span>{t('pago')}</span><span>{t('entrega')}</span><span>{t('total')}</span><span/></div>
  <div className="pedidos-admin-lista">{filtrados.slice(0,limite).map(p=><div key={p.tipo+'-'+p.id} data-pedido={p.id}>{Children.toArray(p.contenido)}</div>)}</div>
  {!filtrados.length&&<div className="pedidos-reales-vacio"><Search size={28} aria-hidden="true"/><h2>{t('vacio')}</h2><p>{t('vacioAyuda')}</p><button type="button" onClick={limpiar}>{t('limpiar')}</button></div>}
  {filtrados.length>limite&&<button className="pedidos-reales-mas" onClick={()=>setLimite(n=>n+20)}>{t('cargarMas',{cantidad:filtrados.length-limite})}</button>}
 </div>;
}
