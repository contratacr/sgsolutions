import 'server-only';
import {createClient} from '@supabase/supabase-js';
import type {CatalogoPublico} from './catalogo-modelo';

let almacen:{url:string;vence:number;existencias:Map<string,number>}|undefined;
/** Compatibility for published snapshots created before stockDisponible was included. */
export async function completarExistencias(catalogo:CatalogoPublico):Promise<CatalogoPublico>{
 if(catalogo.productos.every(p=>typeof p.stockDisponible==='number'))return catalogo;
 const url=process.env.SUPABASE_URL,clave=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!clave)return catalogo;
 try{
  let existencias:Map<string,number>;
  if(almacen?.url===url&&almacen.vence>Date.now())existencias=almacen.existencias;
  else{
   const servicio=createClient(url,clave,{auth:{persistSession:false,autoRefreshToken:false}});
   const {data,error}=await servicio.from('catalogo_privado').select('contenido').eq('id',1).maybeSingle();
   if(error||!Array.isArray(data?.contenido?.productos))return catalogo;
   existencias=new Map();
   for(const p of data.contenido.productos){const stock=p.eurocomp?.stock;if(typeof p.id==='string'&&Number.isSafeInteger(stock)&&stock>=0)existencias.set(p.id,stock);}
   almacen={url,vence:Date.now()+300000,existencias};
  }
  return {...catalogo,productos:catalogo.productos.map(p=>({...p,stockDisponible:typeof p.stockDisponible==='number'?p.stockDisponible:existencias.get(p.id)??null}))};
 }catch{return catalogo;}
}
