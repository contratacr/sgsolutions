'use client';
import {conteoAnonimo} from './estadisticas-agregadas-modelo';
import {rutaPublica,type EventoAnalitica} from './analitica-modelo';
type Pixel=((...args:unknown[])=>void)&{queue:unknown[][];loaded:boolean;version:string;callMethod?:(...args:unknown[])=>void};
declare global {interface Window {fbq?:Pixel;_fbq?:Pixel;}}
export function preferenciasMedicion(){try{const p=JSON.parse(localStorage.getItem('sg-medicion')||'null');return typeof p?.publicidad==='boolean'?{publicidad:p.publicidad}:null;}catch{return null;}}
export function borrarIdentificadoresMedicion(){
 try{sessionStorage.removeItem('sg-medicion-sesion');sessionStorage.removeItem('sg-medicion-actividad');localStorage.removeItem('sg-medicion-visitante');}catch{}
 document.cookie=`sg-analitica=; Path=/; Max-Age=0; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
}
export function medir(tipo:EventoAnalitica['tipo'],detalle=''){
 if(document.body.dataset.excluirMedicion==='1')return;
 const p=preferenciasMedicion();if(!rutaPublica(location.pathname))return;
 const datos=conteoAnonimo.safeParse({tipo,ruta:location.pathname.startsWith('/tienda/')?'/tienda/producto':location.pathname,detalle,dispositivo:innerWidth<=760?'movil':'escritorio',idioma:document.documentElement.lang==='en'?'en':'es'});
 if(datos.success)void fetch('/api/estadisticas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(datos.data),keepalive:true}).catch(()=>{});
 if(p?.publicidad&&window.fbq){const estandar:Partial<Record<EventoAnalitica['tipo'],string>>={pagina:'PageView',producto:'ViewContent',carrito:'AddToCart',whatsapp:'Contact',correo:'Contact',telefono:'Contact'};const nombre=estandar[tipo];if(nombre)window.fbq('track',nombre,tipo==='producto'||tipo==='carrito'?{content_ids:[detalle],content_type:'product'}:{});else window.fbq('trackCustom',tipo,{detalle});}
}
export function iniciarPixel(id:string){
 if(document.body.dataset.excluirMedicion==='1')return;
 if(!/^\d{5,25}$/.test(id)||!preferenciasMedicion()?.publicidad)return;
 if(window.fbq){window.fbq('consent','grant');return;}
 const pixel:Pixel=Object.assign((...args:unknown[])=>{if(pixel.callMethod)pixel.callMethod(...args);else pixel.queue.push(args);},{queue:[] as unknown[][],loaded:true,version:'2.0'});
 window.fbq=window._fbq=pixel;pixel('consent','grant');pixel('set','autoConfig',false,id);pixel('init',id);
 const script=document.createElement('script');script.async=true;script.src='https://connect.facebook.net/en_US/fbevents.js';document.head.append(script);
}
