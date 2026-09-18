'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

// Progressive enhancement: content is visible before hydration and without JS.
export function RevelarScroll(){
 const ruta=usePathname();
 useEffect(()=>{
  const preferencia=matchMedia('(prefers-reduced-motion: reduce)');
  if(!('IntersectionObserver' in window) || ruta.startsWith('/panel') || ruta==='/admin' || ruta==='/acceso' || ruta==='/finalizar-compra')return;
  const vistos=new WeakSet<Element>();
  const animaciones=new Map<Element,Animation>();
  const pendientes=new Set<Element>();
  const bloques='.shop-producto, .portal-tarjeta-marco, .plan, .servicio-grupo, .soporte-pasos li, .historia-cabecera, .historia-foto, .historia-cierre, .contactos-grid > *, .ubicacion-grid > *, .nosotros-principios article, .empresa-necesidades > a, .area-foto, .legal-grid article > section, .contacto, .servicio, .proyecto, .soporte-faq details, .ficha-informacion';
  const selector=`${bloques}, h1, h2, .portal-introduccion, .area-descripcion, .empresa-descripcion, .casos-intro > p, .soporte-bienvenida > p`;
  const observador=new IntersectionObserver(entradas=>{
   // Only elements registered below the initial viewport are revealed.
   let orden=0;
   entradas.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top||a.boundingClientRect.left-b.boundingClientRect.left).forEach(({target})=>{
    observador.unobserve(target);
    target.removeAttribute('data-revelar-pendiente');
    pendientes.delete(target);
    if(preferencia.matches)return;
    const foto=target.matches('.historia-foto, .ubicacion-foto');
    const distancia=innerWidth<600?32:52;
    const escalaInicial=foto?.965:.985;
    target.setAttribute('data-revelando','');
    const animacion=target.animate([
     {opacity:0,transform:`translate3d(0,${distancia}px,0) scale(${escalaInicial})`,offset:0},
     {opacity:.72,transform:'translate3d(0,10px,0) scale(.997)',offset:.72},
     {opacity:1,transform:'translate3d(0,0,0) scale(1)',offset:1}
    ],{duration:foto?1200:1050,delay:Math.min(orden++,3)*120,easing:'cubic-bezier(.22,.68,.24,1)',fill:'backwards'});
    animaciones.set(target,animacion);
    animacion.onfinish=()=>{target.removeAttribute('data-revelando');animaciones.delete(target);};
    animacion.oncancel=()=>target.removeAttribute('data-revelando');
   });
  },{threshold:.05,rootMargin:'0px 0px -7% 0px'});
  const registrar=()=>document.querySelector('main')?.querySelectorAll(selector).forEach(el=>{
   if(vistos.has(el))return;
   vistos.add(el);
   if(el.closest('form, dialog, [role="dialog"]') || el.parentElement?.closest(bloques))return;
   // Above-the-fold content is already part of the initial composition. It
   // should never flash or slide just because JavaScript finished loading.
   if(el.getBoundingClientRect().top<innerHeight*.78 || preferencia.matches)return;
   el.setAttribute('data-revelar-pendiente','');
   pendientes.add(el);
   observador.observe(el);
  });
  registrar();
  const cambios=new MutationObserver(registrar);
  // App Router can replace or stream main after the pathname effect runs.
  // Observe its stable parent so navigation never leaves the new page unregistered.
  cambios.observe(document.body,{childList:true,subtree:true});
  const detener=()=>{if(preferencia.matches){animaciones.forEach(a=>a.cancel());animaciones.clear();pendientes.forEach(el=>el.removeAttribute('data-revelar-pendiente'));pendientes.clear();}};
  const enfocar=(e:FocusEvent)=>{if(e.target instanceof Element){pendientes.forEach(el=>{if(el.contains(e.target as Node)){el.removeAttribute('data-revelar-pendiente');observador.unobserve(el);pendientes.delete(el);}});}if(e.target instanceof Element)animaciones.forEach((a,el)=>{if(el.contains(e.target as Node)){a.cancel();animaciones.delete(el);}});};
  document.addEventListener('focusin',enfocar);
  preferencia.addEventListener('change',detener);
  return ()=>{pendientes.forEach(el=>el.removeAttribute('data-revelar-pendiente'));observador.disconnect();cambios.disconnect();animaciones.forEach(a=>a.cancel());document.removeEventListener('focusin',enfocar);preferencia.removeEventListener('change',detener);};
 },[ruta]);
 return null;
}
