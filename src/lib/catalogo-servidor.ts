import 'server-only';
import {cache} from 'react';
import {migrarCatalogoManual,catalogoPublicoManual} from './catalogo-manual';
import inicial from './catalogo-inicial.json';
import {esquemaCatalogo,publicarCatalogo,type CatalogoAdmin,type CatalogoPublico} from './catalogo-modelo';
import {crearClienteServidor} from './supabase/servidor';
import {leerLocal} from './admin-local';
let inicialValidado:CatalogoAdmin|undefined;
export function obtenerCatalogoInicial(){
 return inicialValidado??=migrarCatalogoManual(esquemaCatalogo.parse(inicial));
}
export const leerCatalogoPublico=cache(async():Promise<CatalogoPublico>=>{
  const local=await leerLocal('catalogo');if(local)return publicarCatalogo(migrarCatalogoManual(esquemaCatalogo.parse(local.contenido)));
  const cliente=await crearClienteServidor();
  if(!cliente) return publicarCatalogo(obtenerCatalogoInicial());
  const {data,error}=await cliente.from('catalogo_publico').select('contenido').eq('id',1).maybeSingle();
  if(error) console.error('CATALOGO_LECTURA_NO_DISPONIBLE',error.code);
  return data?.contenido ? catalogoPublicoManual(data.contenido) : publicarCatalogo(obtenerCatalogoInicial());
});

// Only for authenticated administrators preparing an assisted order.
export async function leerProductosAsesoria(){
 const {sesionLocal}=await import('./admin-local');
 const local=await sesionLocal();
 let datos:CatalogoAdmin;
 if(local){const guardado=await leerLocal('catalogo');datos=guardado?migrarCatalogoManual(esquemaCatalogo.parse(guardado.contenido)):obtenerCatalogoInicial();}
 else{
  const cliente=await crearClienteServidor();if(!cliente)throw new Error('SIN_PERMISO');
  const {data:{user}}=await cliente.auth.getUser();if(!user)throw new Error('SIN_PERMISO');
  const {data:perfil}=await cliente.from('perfiles').select('rol,activo').eq('id',user.id).maybeSingle();
  if(!perfil?.activo||perfil.rol!=='administrador')throw new Error('SIN_PERMISO');
  const {data,error}=await cliente.from('catalogo_privado').select('contenido').eq('id',1).maybeSingle();
  if(error)throw new Error('CATALOGO_NO_DISPONIBLE');
  datos=data?migrarCatalogoManual(esquemaCatalogo.parse(data.contenido)):obtenerCatalogoInicial();
 }
 const publicados=new Map(datos.productos.map(p=>[p.id,p.publicado]));
 return publicarCatalogo({...datos,productos:datos.productos.map(p=>({...p,publicado:true}))}).productos.map(p=>({...p,publicado:publicados.get(p.id)??false}));
}
