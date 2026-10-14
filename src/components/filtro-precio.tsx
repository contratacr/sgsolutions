'use client';
import {useTranslations} from 'next-intl';
import type {CSSProperties} from 'react';
import {colones} from '@/lib/catalogo-modelo';
export function FiltroPrecio({limite,minimo,maximo,cambiar}:{limite:number;minimo:string;maximo:string;cambiar:(desde:string,hasta:string)=>void}){
 const t=useTranslations('Comercio');
 const techo=Math.max(500,Math.ceil(limite/500)*500);
 const desde=Math.min(techo,Math.max(0,Number(minimo)||0));
 const hasta=Math.max(desde,Math.min(techo,maximo===''?techo:Number(maximo)||0));
 const estilo={'--precio-desde':`${desde/techo*100}%`,'--precio-hasta':`${hasta/techo*100}%`} as CSSProperties;
 function actualizar(inferior:number,superior:number){cambiar(inferior===0?'':String(inferior),superior===techo?'':String(superior));}
 return <fieldset className="shop-precio-rango"><legend>{t('precioFiltro')}</legend><p className="shop-precio-valor">{colones(desde)} – {colones(hasta)}</p><div className="shop-precio-controles" style={estilo}>
 <div className="shop-precio-pista" aria-hidden="true"/>
 <input type="range" aria-label={t('precioMin')} aria-valuetext={colones(desde)} min={0} max={techo} step={500} value={desde} disabled={limite<=0} onChange={e=>actualizar(Math.min(Number(e.target.value),hasta),hasta)}/>
 <input type="range" aria-label={t('precioMax')} aria-valuetext={colones(hasta)} min={0} max={techo} step={500} value={hasta} disabled={limite<=0} onChange={e=>actualizar(desde,Math.max(Number(e.target.value),desde))}/>
 </div></fieldset>;
}
