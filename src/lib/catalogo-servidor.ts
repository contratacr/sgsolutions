import 'server-only';
import inicial from './catalogo-inicial.json';
import {esquemaCatalogo,publicarCatalogo,type CatalogoPublico} from './catalogo-modelo';
import {crearClienteServidor} from './supabase/servidor';
export const catalogoInicial=esquemaCatalogo.parse(inicial);
export async function leerCatalogoPublico():Promise<CatalogoPublico>{
  const cliente=await crearClienteServidor();
  if(!cliente) return publicarCatalogo(catalogoInicial);
  const {data,error}=await cliente.from('catalogo_publico').select('contenido').eq('id',1).maybeSingle();
  if(error) console.error('CATALOGO_LECTURA_NO_DISPONIBLE',error.code);
  return data?.contenido ?? publicarCatalogo(catalogoInicial);
}
