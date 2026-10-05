'use server';
import {getLocale} from 'next-intl/server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {sesionLocal} from '@/lib/admin-local';
import {crearClienteServidor} from '@/lib/supabase/servidor';
import {listarAsesorias,cambiarAsesoria,tokenAsesoria,crearAsesoria} from '@/lib/asesorias';
import {leerProductosAsesoria} from '@/lib/catalogo-servidor';

async function preparar(form:FormData){
 const id=String(form.get('id')??'');
 if(id&&!/^[0-9a-f-]{36}$/.test(id))return {resultado:'invalido',id:''};
 let solicitud=id?(await listarAsesorias()).find(s=>s.id===id):undefined;
 if(id&&(!solicitud||!['solicitada','aprobada'].includes(solicitud.estado)))return {resultado:'invalido',id};
 if(form.get('cancelar')==='1'&&solicitud){const cancelada=await cambiarAsesoria(id,solicitud.estado,{estado:'cancelada',token:null});return {resultado:cancelada?'asesoria_cancelada':'error',id};}
 if(form.get('confirmado')!=='on')return {resultado:'invalido',id};
 const productos=await leerProductosAsesoria();
 const ids=form.getAll('producto').map(String),cantidades=form.getAll('cantidad').map(Number),precios=form.getAll('precio').map(Number);
 if(!ids.length||ids.length>30||new Set(ids).size!==ids.length||cantidades.length!==ids.length||precios.length!==ids.length)return {resultado:'invalido',id};
 const articulos=ids.flatMap((id,i)=>{const producto=productos.find(p=>p.id===id)??solicitud?.articulos.find(x=>x.producto.id===id)?.producto,cantidad=cantidades[i],precio=precios[i];return producto&&Number.isInteger(cantidad)&&cantidad>0&&cantidad<=99&&Number.isSafeInteger(precio)&&precio>0&&precio<=100000000?[{producto:{...producto,precio,disponibilidad:'consultar' as const},cantidad}]:[];});
 if(articulos.length!==ids.length||articulos.reduce((s,x)=>s+x.producto.precio*x.cantidad,0)>100000000)return {resultado:'invalido',id};
 if(!solicitud)solicitud=await crearAsesoria(articulos,(await getLocale())==='en'?'en':'es');
 const aprobado=await cambiarAsesoria(solicitud.id,solicitud.estado,{articulos,estado:'aprobada',token:tokenAsesoria(),vence_en:new Date(Date.now()+24*3600000).toISOString()});
 return {resultado:aprobado?'enlace_generado':'error',id:solicitud.id};
}
export async function prepararPedidoAsesorado(form:FormData){
 if(!await sesionLocal()){const cliente=await crearClienteServidor();const user=cliente?(await cliente.auth.getUser()).data.user:null;if(!user)redirect('/admin');const perfil=await cliente!.from('perfiles').select('rol,activo').eq('id',user.id).maybeSingle();if(!perfil.data?.activo||perfil.data.rol!=='administrador')redirect('/panel');}
 const resultado=await preparar(form).catch(()=>({resultado:'error',id:''}));
 revalidatePath('/panel/pedidos');
 const parametros=new URLSearchParams({resultado:resultado.resultado});if(resultado.id)parametros.set('asesoria',resultado.id);
 redirect(`/panel/pedidos?${parametros}`);
}
