'use client';
import {rutaPublica,type EventoAnalitica} from './analitica-modelo';
type Pixel=((...args:unknown[])=>void)&{queue:unknown[][];loaded:boolean;version:string;callMethod?:(...args:unknown[])=>void};
declare global {interface Window {fbq?:Pixel;_fbq?:Pixel;}}
export function preferenciasMedicion(){try{return JSON.parse(localStorage.getItem('sg-medicion')||'null') as {analitica:boolean;publicidad:boolean}|null;}catch{return null;}}
let sesion:string|undefined;
export function medir(tipo:EventoAnalitica['tipo'],detalle=''){
 const p=preferenciasMedicion();if(!rutaPublica(location.pathname))return;
 if(p?.analitica){
  try{sesion=sessionStorage.getItem('sg-medicion-sesion')||crypto.randomUUID();sessionStorage.setItem('sg-medicion-sesion',sesion);}catch{sesion??=crypto.randomUUID();}
  const campana=new URLSearchParams(location.search).get('utm_campaign')||'';
  const evento:EventoAnalitica={id:crypto.randomUUID(),sesion,tipo,ruta:location.pathname,detalle,dispositivo:innerWidth<=760?'movil':'escritorio',idioma:document.documentElement.lang==='en'?'en':'es',campana:/^[a-zA-Z0-9_-]{1,80}$/.test(campana)?campana:''};
  void fetch('/api/analitica',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(evento),keepalive:true}).catch(()=>{});
 }
 if(p?.publicidad&&window.fbq){const estandar:Partial<Record<EventoAnalitica['tipo'],string>>={pagina:'PageView',producto:'ViewContent',carrito:'AddToCart',whatsapp:'Contact',correo:'Contact',telefono:'Contact'};const nombre=estandar[tipo];if(nombre)window.fbq('track',nombre,tipo==='producto'||tipo==='carrito'?{content_ids:[detalle],content_type:'product'}:{});else window.fbq('trackCustom',tipo,{detalle});}
}
export function iniciarPixel(id:string){
 if(!/^\d{5,25}$/.test(id)||!preferenciasMedicion()?.publicidad)return;
 if(window.fbq){window.fbq('consent','grant');return;}
 const pixel:Pixel=Object.assign((...args:unknown[])=>{if(pixel.callMethod)pixel.callMethod(...args);else pixel.queue.push(args);},{queue:[] as unknown[][],loaded:true,version:'2.0'});
 window.fbq=window._fbq=pixel;pixel('consent','grant');pixel('set','autoConfig',false,id);pixel('init',id);
 const script=document.createElement('script');script.async=true;script.src='https://connect.facebook.net/en_US/fbevents.js';document.head.append(script);
}
