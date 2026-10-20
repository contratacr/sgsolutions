'use server';
import {marcarLimpiezaCompra} from '@/lib/limpieza-compra-servidor';
import {conservarExclusionAdministrativa,guardarNavegadorAdministrativo} from '@/lib/exclusion-medicion';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import {adminLocalDisponible,iniciarLocal,salirLocal,sesionLocal} from '@/lib/admin-local';

export async function iniciarSesion(_estado: string, datos: FormData): Promise<string> {
  const validado = z.object({correo: z.email().max(254), clave: z.string().min(1).max(256)}).safeParse(Object.fromEntries(datos));
  if (!validado.success) return 'validacion';
  if(await adminLocalDisponible()){
    if(!await iniciarLocal(validado.data.correo,validado.data.clave))return 'error';
    redirect('/panel');
  }
  const cliente = await crearClienteServidor();
  if (!cliente) return 'noDisponible';
  const {error} = await cliente.auth.signInWithPassword({email: validado.data.correo, password: validado.data.clave});
  if (error) return 'error';
  const permiso=await cliente.rpc('es_administrador_identificado');
  if(permiso.error)return 'error';
  if(permiso.data!==true)return 'sinPermiso';
  redirect('/admin');
}
export async function cerrarSesion() {
  await marcarLimpiezaCompra();
  if(await sesionLocal())await guardarNavegadorAdministrativo();
  await salirLocal();
  const cliente = await crearClienteServidor();
  await conservarExclusionAdministrativa(cliente);
  if (cliente) await cliente.auth.signOut();
  redirect('/admin');
}
