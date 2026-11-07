'use server';
import {exigirAdminMfa} from '@/lib/acceso-panel';
import {migrarCatalogoManual} from '@/lib/catalogo-manual';
import {revalidatePath} from 'next/cache';
import {crearClienteServidor} from '@/lib/supabase/servidor';
import {esquemaCatalogo,publicarCatalogo,descuentosInvalidos,publicacionesManualesInvalidas} from '@/lib/catalogo-modelo';
import {adminLocalDisponible,guardarLocal,leerLocal} from '@/lib/admin-local';
import {incorporarEmpresariales} from '@/lib/incorporar-empresariales';
export async function actualizarCatalogo(revision:number){
 await exigirAdminMfa();
 if(!Number.isSafeInteger(revision)||revision<0)return {error:'validacion'};
 if(await adminLocalDisponible()){
  const r=await leerLocal('catalogo');
  if(!r||r.revision===revision)return {sinCambios:true};
  return {revision:r.revision,catalogo:incorporarEmpresariales(migrarCatalogoManual(esquemaCatalogo.parse(r.contenido)))};
 }
 const cliente=await crearClienteServidor();if(!cliente)return {error:'noDisponible'};
 const estado=await cliente.from('catalogo_privado').select('revision').eq('id',1).maybeSingle();
 if(estado.error||!estado.data)return {error:'noDisponible'};
 if(estado.data.revision===revision)return {sinCambios:true};
 const r=await cliente.from('catalogo_privado').select('contenido,revision').eq('id',1).single();
 if(r.error||!r.data)return {error:'noDisponible'};
 return {revision:r.data.revision as number,catalogo:incorporarEmpresariales(migrarCatalogoManual(esquemaCatalogo.parse(r.data.contenido)))};
}
export async function guardarCatalogo(datos:unknown,revision:number){
 await exigirAdminMfa();
 if(await adminLocalDisponible()){
  const p=esquemaCatalogo.safeParse(datos);if(!p.success||descuentosInvalidos(p.data).length>0||!Number.isInteger(revision)||revision<0)return {error:'validacion'};
  if(publicacionesManualesInvalidas(p.data).length)return {error:'publicacionInvalida'};
  const r=await guardarLocal('catalogo',migrarCatalogoManual(p.data),revision);if(!r.error)revalidatePath('/','layout');return r;
 }
 const cliente=await crearClienteServidor();
 if(!cliente) return {error:'noDisponible'};
 // exigirAdminMfa already verifies the session, active administrator and MFA.
 // guardar_catalogo repeats authorization atomically inside the database.
 const validado=esquemaCatalogo.safeParse(datos);
 if(!validado.success||descuentosInvalidos(validado.data).length>0||!Number.isInteger(revision)||revision<0)return {error:'validacion'};
 if(publicacionesManualesInvalidas(validado.data).length)return {error:'publicacionInvalida'};
 const privado=migrarCatalogoManual(validado.data);
 const visible=publicarCatalogo(privado);
 const {data,error}=await cliente.rpc('guardar_catalogo',{privado,visible,revision_esperada:revision});
 if(error)return {error:error.message.includes('CONFLICTO')?'conflicto':error.message.includes('INVENTARIO_CON_RESERVAS')?'inventarioReservado':'error'};
 if(!Number.isInteger(data)||data!==revision+1)return {error:'error'};
 revalidatePath('/','layout');
 return {revision:Number(data)};
}
