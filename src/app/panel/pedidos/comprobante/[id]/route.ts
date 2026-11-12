import {NextResponse,type NextRequest} from 'next/server';
import {leerAccesoPanel} from '@/lib/acceso-panel';
import {sesionLocal} from '@/lib/admin-local';
import {crearClienteServidor} from '@/lib/supabase/servidor';
import {basePedidosManuales,configuracionPedidosManuales} from '@/lib/pedidos-manuales';

const privado={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
const respuesta=(estado:number)=>new NextResponse(null,{status:estado,headers:privado});

/** Signs the payment receipt on demand, so a panel opened for hours never shows an expired link. */
export async function GET(_req:NextRequest,ctx:{params:Promise<{id:string}>}){
 if(await leerAccesoPanel()!=='administrador')return new NextResponse(null,{status:403,headers:privado});
 if(!await sesionLocal()){
  const cliente=await crearClienteServidor();const user=cliente?(await cliente.auth.getUser()).data.user:null;if(!cliente||!user)return respuesta(401);
  const {data:perfil}=await cliente.from('perfiles').select('rol,activo').eq('id',user.id).maybeSingle();
  if(!perfil?.activo||perfil.rol!=='administrador')return respuesta(403);
 }
 const {id}=await ctx.params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return respuesta(404);
 const config=configuracionPedidosManuales();if(!config)return respuesta(404);
 const db=basePedidosManuales(config);
 const {data:pedido,error}=await db.from('pedidos_manuales').select('comprobante_path').eq('id',id).maybeSingle();
 if(error||!pedido?.comprobante_path)return respuesta(404);
 const firmado=await db.storage.from('comprobantes-pedidos').createSignedUrl(pedido.comprobante_path,60);
 if(firmado.error||!firmado.data?.signedUrl)return respuesta(502);
 return NextResponse.redirect(firmado.data.signedUrl,{status:303,headers:privado});
}
