import {leerCatalogoPublico} from '@/lib/catalogo-servidor';
import {consultarCatalogo} from '@/lib/catalogo-consulta';
export async function GET(request:Request){
 const params=new URL(request.url).searchParams;
 const c=await leerCatalogoPublico();
 if(params.has('ids')){
  const ids=(params.get('ids')??'').split(',');
  if(ids.length>30||ids.some(id=>!/^[a-z0-9][a-z0-9-]{0,59}$/.test(id)))return Response.json({error:'PARAMETROS_INVALIDOS'},{status:400});
  return Response.json({productos:c.productos.filter(p=>ids.includes(p.id))},{headers:{'Cache-Control':'no-store'}});
 }
 return Response.json(consultarCatalogo(c,params),{headers:{'Cache-Control':'no-store'}});
}
