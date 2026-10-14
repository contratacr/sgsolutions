import 'server-only';
import {crearClienteServidor} from './supabase/servidor';
let cache:{vence:number;datos:Record<string,number>}|undefined;
export async function popularidadCatalogo():Promise<Record<string,number>>{
 if(cache&&cache.vence>Date.now())return cache.datos;
 const cliente=await crearClienteServidor();if(!cliente)return {};
 try{const {data,error}=await cliente.rpc('popularidad_catalogo');if(error||!Array.isArray(data))return {};const datos=Object.fromEntries(data.filter(x=>typeof x.producto_id==='string'&&Number.isFinite(Number(x.puntuacion))).map(x=>[x.producto_id,Number(x.puntuacion)]));cache={vence:Date.now()+300000,datos};return datos;}catch{return {};}
}
