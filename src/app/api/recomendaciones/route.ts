import {leerCatalogoPublico} from '@/lib/catalogo-servidor';
import {recomendaciones} from '@/lib/recomendaciones';
export async function GET(request:Request){
 const params=new URL(request.url).searchParams;
 const ids=(params.get('vistos')??'').split(',').filter(Boolean),actual=params.get('actual')||undefined,explorados=(params.get('explorados')??'').split(',').filter(Boolean);
 if(ids.length>20||explorados.length>20||[...ids,...explorados,...(actual?[actual]:[])].some(id=>!/^[a-z0-9][a-z0-9-]{0,59}$/.test(id)))return Response.json({error:'PARAMETROS_INVALIDOS'},{status:400});
 const productos=(await leerCatalogoPublico()).productos;const resultado=recomendaciones(productos,explorados,actual);resultado.recientes=recomendaciones(productos,ids,actual).recientes;
 return Response.json(resultado,{headers:{'Cache-Control':'private, no-store'}});
}
