'use client';
import {SelectorMenu} from './selector-menu';
import {useRef,useState,type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {Search} from 'lucide-react';
export function ListaPanel({items,filtros,inicial='todos',destacado}:{destacado?:string;items:{id:string;busqueda:string;estado:string;archivado?:boolean;pago?:string;contenido:ReactNode}[];filtros:{id:string;texto:string;estados?:string[];archivados?:boolean;incluyeArchivados?:boolean}[];inicial?:string}){
 const t=useTranslations('PanelLista'),[buscar,setBuscar]=useState(''),[pago,setPago]=useState('todos'),[filtro,setFiltro]=useState(inicial),[pagina,setPagina]=useState(()=>{const actual=filtros.find(f=>f.id===inicial);const indice=items.filter(x=>(actual?.incluyeArchivados||Boolean(x.archivado)===Boolean(actual?.archivados))&&(!actual?.estados||actual.estados.includes(x.estado))).findIndex(x=>x.id===destacado);return Math.floor(Math.max(0,indice)/10)+1;}),lista=useRef<HTMLDivElement>(null);
 const actual=filtros.find(f=>f.id===filtro);
 const coincidencias=items.filter(x=>(actual?.incluyeArchivados||Boolean(x.archivado)===Boolean(actual?.archivados))&&(!actual?.estados||actual.estados.includes(x.estado))&&(pago==='todos'||(pago==='confirmado'?x.pago==='pagado':x.pago!=='pagado'))&&x.busqueda.toLocaleLowerCase().includes(buscar.trim().toLocaleLowerCase()));
 const paginas=Math.max(1,Math.ceil(coincidencias.length/10)),visible=Math.min(pagina,paginas);
 function cambiarPagina(p:number){setPagina(p);requestAnimationFrame(()=>lista.current?.scrollIntoView({block:'start',behavior:'smooth'}));}
 return <div className="panel-lista" ref={lista}>
  <div className="panel-lista-herramientas"><label className="panel-buscador"><Search size={18} aria-hidden="true"/><span className="sr-only">{t('buscar')}</span><input type="search" placeholder={t('buscar')} value={buscar} onChange={e=>{setBuscar(e.target.value);setPagina(1);}}/></label><div className="panel-lista-vistas" role="group" aria-label={t('filtrar')}>{filtros.filter(f=>!f.archivados).map(f=><button key={f.id} type="button" aria-pressed={filtro===f.id} onClick={()=>{setFiltro(f.id);setPagina(1);}}>{f.texto}<span>{items.filter(x=>(f.incluyeArchivados||Boolean(x.archivado)===Boolean(f.archivados))&&(!f.estados||f.estados.includes(x.estado))).length}</span></button>)}</div><div className="panel-lista-secundarios">{items.some(x=>x.pago)&&<div className="panel-selector"><span>{t('estadoPago')}</span><SelectorMenu etiqueta={t('estadoPago')} valor={pago} cambiar={valor=>{setPago(valor);setPagina(1);}} opciones={[{valor:'todos',texto:t('todos')},{valor:'pendiente',texto:t('pagoPendiente')},{valor:'confirmado',texto:t('pagoConfirmado')}]}/></div>}{filtros.some(f=>f.archivados)&&<div className="panel-selector"><span>{t('archivo')}</span><SelectorMenu etiqueta={t('archivo')} valor={filtros.find(f=>f.id===filtro)?.archivados?filtro:''} cambiar={valor=>{setFiltro(valor||(filtros.find(f=>f.id===inicial)?.archivados?filtros.find(f=>!f.archivados)!.id:inicial));setPagina(1);}} opciones={[{valor:'',texto:t('vistaActual')},...filtros.filter(f=>f.archivados).map(f=>({valor:f.id,texto:`${f.texto} (${items.filter(x=>x.archivado).length})`}))]}/></div>}</div></div>
  <p role="status" className="panel-ayuda">{t('resultados',{cantidad:coincidencias.length})}</p>
  <div className="pedidos-admin-lista">{coincidencias.slice((visible-1)*10,visible*10).map(x=><div key={x.id}>{x.contenido}</div>)}</div>
  {!coincidencias.length&&<p className="admin-lista-vacia">{t('vacio')}</p>}
  {paginas>1&&<nav className="admin-paginacion" aria-label={t('paginacion')}><button disabled={visible===1} onClick={()=>cambiarPagina(visible-1)}>{t('anterior')}</button><span>{t('pagina',{pagina:visible,total:paginas})}</span><button disabled={visible===paginas} onClick={()=>cambiarPagina(visible+1)}>{t('siguiente')}</button></nav>}
 </div>;
}
export function SeccionesPedidos({secciones,inicial}:{inicial?:string;secciones:{id:string;nombre:string;cantidad:number;contenido:ReactNode}[]}){
 const [actual,setActual]=useState(inicial??secciones[0].id),t=useTranslations('PanelLista');
 return <><div className="panel-pedidos-vistas" role="group" aria-label={t('tipoPedidos')}>{secciones.map(s=><button type="button" key={s.id} aria-pressed={s.id===actual} onClick={()=>setActual(s.id)}>{s.nombre}<span>{s.cantidad}</span></button>)}</div>{secciones.map(s=><div key={s.id} hidden={s.id!==actual}>{s.contenido}</div>)}</>;
}
