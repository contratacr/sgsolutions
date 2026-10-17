import {leerTextoLimitado} from '@/lib/limites-http';
import {origenPermitido} from '@/lib/origen-permitido';
import {esquemaPerfilCompra} from '@/lib/perfil-compra';
import {guardarPerfilCompra} from '@/lib/guardar-perfil-compra';

export async function POST(request:Request){
 if(!origenPermitido(request))return Response.json({estado:'invalido'},{status:403});
 let datos;
 try{
  const body=await leerTextoLimitado(request,10000);
  if(body.length>10000)throw new Error('LIMITE');
  datos=esquemaPerfilCompra.parse(JSON.parse(body));
 }catch{return Response.json({estado:'invalido'},{status:400});}
 const form=new FormData();
 for(const [key,value] of Object.entries(datos))form.set(key,value);
 const estado=await guardarPerfilCompra(form);
 return Response.json({estado},{status:estado==='guardado'?200:estado==='sinSesion'?401:estado==='invalido'?400:503,headers:{'Cache-Control':'no-store'}});
}

