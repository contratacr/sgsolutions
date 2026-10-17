'use client';
import {useTranslations} from 'next-intl';
import type {CSSProperties} from 'react';
import {colones} from '@/lib/catalogo-modelo';
export function FiltroPrecio({limite,piso=0,cargando=false,minimo,maximo,cambiar}:{limite:number;piso?:number;cargando?:boolean;minimo:string;maximo:string;cambiar:(desde:string,hasta:string)=>void}){
 const t=useTranslations('Comercio');
 const suelo=Math.max(0,piso),techo=Math.max(suelo,limite);
 const amplitud=techo-suelo,paso=amplitud%500===0?500:1;
 const desde=Math.min(techo,Math.max(suelo,minimo===''?suelo:Number(minimo)||suelo));
 const hasta=Math.max(desde,Math.min(techo,maximo===''?techo:Number(maximo)||0));
 const estilo={'--precio-desde':`${(amplitud?(desde-suelo)/amplitud*100:0)}%`,'--precio-hasta':`${(amplitud?(hasta-suelo)/amplitud*100:100)}%`} as CSSProperties;
 function actualizar(inferior:number,superior:number){cambiar(inferior===suelo?'':String(inferior),superior===techo?'':String(superior));}
 return <fieldset className="shop-precio-rango" aria-busy={cargando}><legend>{t('precioFiltro')}</legend><p className="shop-precio-valor">{colones(desde)} – {colones(hasta)}</p><div className="shop-precio-controles" style={estilo}>
 <div className="shop-precio-pista" aria-hidden="true"/>
 <input type="range" aria-label={t('precioMin')} aria-valuetext={colones(desde)} min={suelo} max={techo} step={paso} value={desde} disabled={cargando||amplitud<=0} onChange={e=>actualizar(Math.min(Number(e.target.value),hasta),hasta)}/>
 <input type="range" aria-label={t('precioMax')} aria-valuetext={colones(hasta)} min={suelo} max={techo} step={paso} value={hasta} disabled={cargando||amplitud<=0} onChange={e=>actualizar(desde,Math.max(Number(e.target.value),desde))}/>
 </div></fieldset>;
}
