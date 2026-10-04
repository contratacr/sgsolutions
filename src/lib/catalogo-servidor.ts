import 'server-only';
import {migrarCatalogoManual,catalogoPublicoManual} from './catalogo-manual';
import inicial from './catalogo-inicial.json';
import {esquemaCatalogo,publicarCatalogo,type CatalogoPublico} from './catalogo-modelo';
import {crearClienteServidor} from './supabase/servidor';
import {leerLocal} from './admin-local';
export const catalogoInicial=migrarCatalogoManual(esquemaCatalogo.parse(inicial));
export async function leerCatalogoPublico():Promise<CatalogoPublico>{
  const local=await leerLocal('catalogo');if(local)return publicarCatalogo(migrarCatalogoManual(esquemaCatalogo.parse(local.contenido)));
  const cliente=await crearClienteServidor();
  if(!cliente) return publicarCatalogo(catalogoInicial);
  const {data,error}=await cliente.from('catalogo_publico').select('contenido').eq('id',1).maybeSingle();
  if(error) console.error('CATALOGO_LECTURA_NO_DISPONIBLE',error.code);
  return data?.contenido ? catalogoPublicoManual(data.contenido) : publicarCatalogo(catalogoInicial);
}
