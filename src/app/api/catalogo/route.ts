import {leerCatalogoPublico} from '@/lib/catalogo-servidor';
import {popularidadCatalogo} from '@/lib/popularidad-catalogo';
import {consultarCatalogo} from '@/lib/catalogo-consulta';
export async function GET(request:Request){
 const params=new URL(request.url).searchParams;
 const c=await leerCatalogoPublico();
 if(params.get('sugerencias')==='1'){
  const q=(params.get('q')??'').trim().slice(0,150);
  const limpios=new URLSearchParams({q,idioma:params.get('idioma')==='en'?'en':'es',categoria:'todos',orden:'recomendados'});
  const resultado=consultarCatalogo(c,limpios);
  return Response.json({...resultado,productos:resultado.productos.slice(0,6)},{headers:{'Cache-Control':'no-store'}});
 }
 if(params.has('ids')){
  const ids=(params.get('ids')??'').split(',');
  if(ids.length>30||ids.some(id=>!/^[a-z0-9][a-z0-9-]{0,59}$/.test(id)))return Response.json({error:'PARAMETROS_INVALIDOS'},{status:400});
  return Response.json({productos:c.productos.filter(p=>ids.includes(p.id))},{headers:{'Cache-Control':'no-store'}});
 }
 return Response.json(consultarCatalogo(c,params,(params.get('orden')??'recomendados')==='recomendados'?await popularidadCatalogo():{}),{headers:{'Cache-Control':'no-store'}});
}
