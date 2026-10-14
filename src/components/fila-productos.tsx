'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import {useTranslations} from 'next-intl';
export function FilaProductos({titulo,children}:{titulo:string;children:ReactNode}){
 const t=useTranslations('AccionesProducto'),fila=useRef<HTMLDivElement>(null);const [limites,setLimites]=useState({inicio:true,fin:true});
 useEffect(()=>{const el=fila.current;if(!el)return;const revisar=()=>setLimites({inicio:el.scrollLeft<=1,fin:el.scrollLeft+el.clientWidth>=el.scrollWidth-2});revisar();const resize=new ResizeObserver(revisar);resize.observe(el);el.addEventListener('scroll',revisar,{passive:true});return()=>{resize.disconnect();el.removeEventListener('scroll',revisar);};},[children]);
 function mover(signo:number){const el=fila.current;if(!el)return;const tarjeta=el.firstElementChild?.getBoundingClientRect().width??el.clientWidth;el.scrollBy({left:signo*(tarjeta+16),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 return <section className="recomendaciones-fila" aria-label={titulo}><div className="recomendaciones-cabecera"><h2>{titulo}</h2><div className="recomendaciones-controles"><button type="button" disabled={limites.inicio} aria-label={t('anteriores')} onClick={()=>mover(-1)}><ArrowLeft size={18}/></button><button type="button" disabled={limites.fin} aria-label={t('siguientes')} onClick={()=>mover(1)}><ArrowRight size={18}/></button></div></div><div className="recomendaciones-grid" ref={fila} tabIndex={0} role="region" aria-label={titulo}>{children}</div></section>;
}
