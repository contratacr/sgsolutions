import {leerUrlTienda,parametrosUrlTienda} from './url-tienda';
const clave='sg-retorno-tienda-v1';
const vigencia=30*60*1000;
function seleccionActual(){
 const q=parametrosUrlTienda(leerUrlTienda(new URLSearchParams(location.search))).toString();
 return '/tienda'+(q?'?'+q:'');
}
export function leerRetornoTienda(producto:string){
 try{
  const valor=JSON.parse(sessionStorage.getItem(clave)||'null');
  if(valor?.producto!==producto||!Number.isFinite(valor.fecha)||Date.now()-valor.fecha>vigencia||valor.fecha>Date.now()||typeof valor.ruta!=='string')return '/tienda';
  const ruta=new URL(valor.ruta,location.origin);
  if(ruta.origin!==location.origin||ruta.pathname!=='/tienda')return '/tienda';
  const q=parametrosUrlTienda(leerUrlTienda(ruta.searchParams)).toString();
  return '/tienda'+(q?'?'+q:'');
 }catch{return '/tienda';}
}
/** Only the actual store selection is retained; a product's category adds no filter. */
export function recordarRetornoTienda(destino:string){
 try{
  const url=new URL(destino,location.origin);
  if(url.origin!==location.origin||!/^\/tienda\/[^/]+$/.test(url.pathname))return;
  const ruta=location.pathname==='/tienda'?seleccionActual():leerRetornoTienda(location.pathname);
  sessionStorage.setItem(clave,JSON.stringify({producto:url.pathname,ruta,fecha:Date.now()}));
 }catch{/* Store navigation also works when session storage is unavailable. */}
}
