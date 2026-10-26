'use client';
import {useId,useState} from 'react';
import {Search,X} from 'lucide-react';
import {useTranslations} from 'next-intl';
export type SugerenciaCatalogo={id:string;texto:string;tipo:'marca'|'categoria'|'producto'};
export function BuscadorCatalogo({valor,listo,sugerencias,cambiar,limpiar,elegir}:{valor:string;listo:boolean;sugerencias:SugerenciaCatalogo[];cambiar:(valor:string)=>void;limpiar:()=>void;elegir:(opcion:SugerenciaCatalogo)=>void}){
 const t=useTranslations('BusquedaCatalogo'),id=useId(),[abierto,setAbierto]=useState(false),[indice,setIndice]=useState(-1);
 const visible=abierto&&valor.trim().length>=2&&sugerencias.length>0;
 const activo=visible&&indice>=0&&indice<sugerencias.length?indice:-1;
 function seleccionar(opcion:SugerenciaCatalogo){elegir(opcion);setAbierto(false);setIndice(-1);}
 return <div className="shop-autocompletar" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)){setAbierto(false);setIndice(-1);}}}>
  <div className="shop-buscador"><Search size={23} aria-hidden="true"/><label className="sr-only" htmlFor="buscar-equipo">{t('buscar')}</label><input id="buscar-equipo" type="search" role="combobox" aria-autocomplete="list" aria-expanded={visible} aria-controls={visible?id:undefined} aria-activedescendant={activo>=0?`${id}-${activo}`:undefined} autoComplete="off" disabled={!listo} value={valor} placeholder={t('buscar')} maxLength={150} onFocus={()=>setAbierto(true)} onChange={e=>{cambiar(e.target.value);setAbierto(true);setIndice(-1);}} onKeyDown={e=>{
   if(e.nativeEvent.isComposing)return;
   if(e.key==='Escape'){e.preventDefault();setAbierto(false);setIndice(-1);return;}
   if((e.key==='ArrowDown'||e.key==='ArrowUp')&&sugerencias.length){e.preventDefault();setAbierto(true);setIndice(e.key==='ArrowDown'?(activo+1)%sugerencias.length:(activo<=0?sugerencias.length:activo)-1);}
   if(e.key==='Enter'){e.preventDefault();if(activo>=0)seleccionar(sugerencias[activo]);else{setAbierto(false);setIndice(-1);}}
  }}/>{valor&&<button type="button" aria-label={t('limpiar')} onClick={()=>{limpiar();setAbierto(false);setIndice(-1);}}><X size={20}/></button>}</div>
  {visible&&<ul id={id} className="shop-sugerencias" role="listbox" aria-label={t('sugerencias')}>{sugerencias.map((opcion,i)=><li id={`${id}-${i}`} key={opcion.tipo+opcion.id} role="option" aria-selected={activo===i} onPointerDown={e=>e.preventDefault()} onClick={()=>seleccionar(opcion)}><span>{opcion.texto}</span><small>{t(opcion.tipo)}</small></li>)}</ul>}
 </div>;
}
