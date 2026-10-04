'use server';
import {getLocale} from 'next-intl/server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {sesionLocal} from '@/lib/admin-local';
import {crearClienteServidor} from '@/lib/supabase/servidor';
import {listarAsesorias,cambiarAsesoria,tokenAsesoria,crearAsesoria} from '@/lib/asesorias';
import {leerCatalogoPublico} from '@/lib/catalogo-servidor';
export async function prepararPedidoAsesorado(form:FormData){
 if(!await sesionLocal()){const cliente=await crearClienteServidor();const user=cliente?(await cliente.auth.getUser()).data.user:null;if(!user)redirect('/admin');const perfil=await cliente!.from('perfiles').select('rol,activo').eq('id',user.id).maybeSingle();if(!perfil.data?.activo||perfil.data.rol!=='administrador')redirect('/panel');}
 const id=String(form.get('id')??'');
 let solicitud=id?(await listarAsesorias()).find(s=>s.id===id):undefined;
 if(id&&(!solicitud||!['solicitada','aprobada'].includes(solicitud.estado)))redirect('/panel/pedidos?resultado=invalido');
 if(form.get('cancelar')==='1'&&solicitud){await cambiarAsesoria(id,solicitud.estado,{estado:'cancelada',token:null});revalidatePath('/panel/pedidos');redirect('/panel/pedidos');}
 if(form.get('confirmado')!=='on')redirect('/panel/pedidos?resultado=invalido');
 const catalogo=await leerCatalogoPublico();
 const ids=form.getAll('producto').map(String),cantidades=form.getAll('cantidad').map(Number),precios=form.getAll('precio').map(Number);
 if(!ids.length||ids.length>30||new Set(ids).size!==ids.length)redirect('/panel/pedidos?resultado=invalido');
 const articulos=ids.flatMap((id,i)=>{const producto=catalogo.productos.find(p=>p.id===id),cantidad=cantidades[i],precio=precios[i];return producto&&Number.isInteger(cantidad)&&cantidad>0&&cantidad<=99&&Number.isSafeInteger(precio)&&precio>0&&precio<=100000000?[{producto:{...producto,precio,disponibilidad:'consultar' as const},cantidad}]:[];});
 if(articulos.length!==ids.length||articulos.reduce((s,x)=>s+x.producto.precio*x.cantidad,0)>100000000)redirect('/panel/pedidos?resultado=invalido');
 if(!solicitud)solicitud=await crearAsesoria(articulos,(await getLocale())==='en'?'en':'es');
 const aprobado=await cambiarAsesoria(solicitud.id,solicitud.estado,{articulos,estado:'aprobada',token:tokenAsesoria(),vence_en:new Date(Date.now()+24*3600000).toISOString()});
 revalidatePath('/panel/pedidos');redirect(`/panel/pedidos?resultado=${aprobado?'guardado':'error'}`);
}
