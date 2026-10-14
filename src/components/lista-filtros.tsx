'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';

export function ListaFiltros({className,children,etiqueta}:{className:string;children:ReactNode;etiqueta?:string}){
 const marco=useRef<HTMLDivElement>(null),lista=useRef<HTMLDivElement>(null),[hayMas,setHayMas]=useState(false),[barra,setBarra]=useState<{alto:number;arriba:number;pista:number}|null>(null);
 useEffect(()=>{
  const elemento=lista.current;if(!elemento)return;
  const revisar=()=>{
   const disponible=marco.current?.clientHeight??0;
   if(disponible>0&&elemento.closest('.shop-panel-filtros')&&matchMedia('(max-width:850px)').matches){const paso=48;const alto=Math.max(36,Math.floor(Math.max(0,disponible-30)/paso)*paso+30);elemento.style.height=`${Math.min(disponible,alto)}px`;if(elemento.classList.contains('shop-categorias'))(elemento.closest('.modal-nativo-cuerpo') as HTMLElement|null)?.style.setProperty('--categorias-recorte',`${disponible-Math.min(disponible,alto)}px`);}
   const alto=elemento.clientHeight,total=elemento.scrollHeight;
   setHayMas(alto>0&&total-elemento.scrollTop-alto>2);
   if(alto>0&&total>alto+2){const thumb=Math.min(alto,Math.max(24,alto*alto/total));setBarra({pista:alto,alto:thumb,arriba:(alto-thumb)*elemento.scrollTop/(total-alto)});}else setBarra(null);
  };
  const tamano=new ResizeObserver(revisar),contenido=new MutationObserver(revisar);
  tamano.observe(elemento);if(marco.current)tamano.observe(marco.current);contenido.observe(elemento,{childList:true,subtree:true,characterData:true});elemento.addEventListener('scroll',revisar,{passive:true});revisar();
  return()=>{tamano.disconnect();contenido.disconnect();elemento.removeEventListener('scroll',revisar);};
 },[]);
 return <div ref={marco} className="shop-lista-marco" data-hay-mas={hayMas}><div ref={lista} className={className} role={etiqueta?'group':undefined} aria-label={etiqueta}>{children}</div>{barra&&<span className="shop-lista-barra" aria-hidden="true" style={{height:barra.pista}}><span style={{height:barra.alto,transform:`translateY(${barra.arriba}px)`}}/></span>}</div>;
}
