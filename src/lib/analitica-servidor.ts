import 'server-only';
import {leerContadoresLocales} from './estadisticas-agregadas-servidor';
import {adminLocalDisponible} from './admin-local';
import {crearClienteServidor} from './supabase/servidor';
import {type ResumenAnalitica} from './analitica-modelo';
export function fechasAnalitica(dias:number){
 const fecha=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}),ahora=Date.now();
 return Array.from({length:dias},(_,i)=>fecha.format(ahora-(dias-1-i)*86400000));
}
export async function resumenAnalitica(dias:7|30=30):Promise<ResumenAnalitica|null>{
 if(await adminLocalDisponible()){
  const filas=(await leerContadoresLocales()).filter(f=>f.fecha>=fechasAnalitica(dias)[0]);
  const agrupar=(campo:'dispositivo'|'idioma')=>[...new Set(filas.map(e=>e[campo]))].map(detalle=>({detalle,cantidad:filas.filter(e=>e.tipo==='pagina'&&e[campo]===detalle).reduce((s,e)=>s+e.cantidad,0)}));
  const grupos=new Map<string,{tipo:string;detalle:string;cantidad:number}>();for(const f of filas){const detalle=f.tipo==='pagina'?f.ruta:f.detalle,k=f.tipo+'|'+detalle,v=grupos.get(k)??{tipo:f.tipo,detalle,cantidad:0};v.cantidad+=f.cantidad;grupos.set(k,v);}
  return {modo:'agregado',total:filas.reduce((s,e)=>s+e.cantidad,0),sesiones:0,filas:[...grupos.values()],diario:fechasAnalitica(dias).map(fecha=>{const n=filas.filter(f=>f.tipo==='pagina'&&f.fecha===fecha).reduce((s,f)=>s+f.cantidad,0);return {fecha,visitas:n,paginas:n};}),dispositivos:agrupar('dispositivo'),idiomas:agrupar('idioma')};
 }
 const db=await crearClienteServidor();if(!db)return null;const {data,error}=await db.rpc('resumen_estadisticas_agregadas_panel',{dias});
 if(error){console.error('ESTADISTICAS_NO_DISPONIBLES',error.code);return null;}return data as ResumenAnalitica;
}

export type PopularidadProductos={vistas:{id:string;cantidad:number}[];compras:{id:string;nombre?:string;cantidad:number;pedidos:number}[]};
export async function popularidadProductos(dias:7|30=30):Promise<PopularidadProductos|null>{
 if(await adminLocalDisponible()){
  const desde=fechasAnalitica(dias)[0];
  const conteos=new Map<string,number>();
  for(const e of (await leerContadoresLocales()).filter(e=>e.tipo==='producto'&&e.fecha>=desde))conteos.set(e.detalle,(conteos.get(e.detalle)??0)+e.cantidad);
  return {vistas:[...conteos].map(([id,cantidad])=>({id,cantidad})),compras:[]};
 }
 const db=await crearClienteServidor();if(!db)return null;
 const {data,error}=await db.rpc('popularidad_productos_agregada_panel',{dias});
 return error?null:data as PopularidadProductos;
}
