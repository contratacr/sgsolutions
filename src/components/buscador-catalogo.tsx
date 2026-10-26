'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {Search,X} from 'lucide-react';
import {FotoProducto} from './foto-producto';
import {colones} from '@/lib/catalogo-modelo';
import {useTranslations} from 'next-intl';
export type SugerenciaCatalogo={id:string;texto:string;tipo:'marca'|'categoria'|'producto';imagen?:string;precio?:number|null;codigo?:string};
export function BuscadorCatalogo({valor,listo,sugerencias,cambiar,limpiar,elegir,total,verResultados}:{valor:string;listo:boolean;sugerencias:SugerenciaCatalogo[];cambiar:(valor:string)=>void;limpiar:()=>void;elegir:(opcion:SugerenciaCatalogo)=>void;total?:number;verResultados:()=>void}){
 const t=useTranslations('BusquedaCatalogo'),id=useId(),[abierto,setAbierto]=useState(false),[indice,setIndice]=useState(-1);
 const contenedor=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!abierto)return;
  const cerrarFuera=(event:PointerEvent)=>{if(event.target instanceof Node&&!contenedor.current?.contains(event.target)){setAbierto(false);setIndice(-1);}};
  document.addEventListener('pointerdown',cerrarFuera);
  return()=>document.removeEventListener('pointerdown',cerrarFuera);
 },[abierto]);
 const visible=abierto&&valor.trim().length>=2&&sugerencias.length>0;
 const activo=visible&&indice>=0&&indice<sugerencias.length?indice:-1;
 function mostrarTodos(){setAbierto(false);setIndice(-1);verResultados();}
 function seleccionar(opcion:SugerenciaCatalogo){elegir(opcion);setAbierto(false);setIndice(-1);}
 return <div ref={contenedor} className="shop-autocompletar" onBlur={e=>{if(e.relatedTarget&&!e.currentTarget.contains(e.relatedTarget)){setAbierto(false);setIndice(-1);}}}>
  <div className="shop-buscador"><Search size={23} aria-hidden="true"/><label className="sr-only" htmlFor="buscar-equipo">{t('buscar')}</label><input id="buscar-equipo" type="search" role="combobox" aria-autocomplete="list" aria-expanded={visible} aria-controls={visible?id:undefined} aria-activedescendant={activo>=0?`${id}-${activo}`:undefined} autoComplete="off" disabled={!listo} value={valor} title={valor||undefined} placeholder={t('buscar')} maxLength={150} onFocus={()=>setAbierto(true)} onChange={e=>{cambiar(e.target.value);setAbierto(true);setIndice(-1);}} onKeyDown={e=>{
   if(e.nativeEvent.isComposing)return;
   if(e.key==='Escape'){e.preventDefault();setAbierto(false);setIndice(-1);return;}
   if((e.key==='ArrowDown'||e.key==='ArrowUp')&&sugerencias.length){e.preventDefault();setAbierto(true);setIndice(e.key==='ArrowDown'?(activo+1)%sugerencias.length:(activo<=0?sugerencias.length:activo)-1);}
   if(e.key==='Enter'){e.preventDefault();if(activo>=0)seleccionar(sugerencias[activo]);else mostrarTodos();}
  }}/>{valor&&<button type="button" aria-label={t('limpiar')} onClick={()=>{limpiar();setAbierto(false);setIndice(-1);}}><X size={20}/></button>}</div>
  {visible&&<div className="shop-sugerencias-panel"><ul id={id} className="shop-sugerencias" role="listbox" aria-label={t('sugerencias')}>{sugerencias.map((opcion,i)=><li id={`${id}-${i}`} key={opcion.tipo+opcion.id} role="option" tabIndex={-1} aria-selected={activo===i} onMouseDown={e=>e.preventDefault()} onClick={()=>seleccionar(opcion)}><>{opcion.tipo==='producto'&&opcion.imagen&&<span className="shop-sugerencia-foto"><FotoProducto src={opcion.imagen} alt=""/></span>}<span className="shop-sugerencia-texto">{opcion.texto}{opcion.codigo&&<small>{opcion.codigo}</small>}</span>{opcion.tipo==='producto'?<strong className="shop-sugerencia-precio">{opcion.precio==null?t('precioPendiente'):colones(opcion.precio)}</strong>:<small>{t(opcion.tipo)}</small>}</></li>)}</ul>{total!==undefined&&<button type="button" className="shop-sugerencias-todos" onClick={mostrarTodos}>{t('verTodos',{cantidad:total})}</button>}</div>}
 </div>;
}
