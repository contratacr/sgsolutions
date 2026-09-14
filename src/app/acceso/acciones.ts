'use server';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/servidor';

export async function iniciarSesion(_estado: string, datos: FormData): Promise<string> {
  const validado = z.object({correo: z.email().max(254), clave: z.string().min(1).max(256)}).safeParse(Object.fromEntries(datos));
  if (!validado.success) return 'validacion';
  const cliente = await crearClienteServidor();
  if (!cliente) return 'noDisponible';
  const {error} = await cliente.auth.signInWithPassword({email: validado.data.correo, password: validado.data.clave});
  if (error) return 'error';
  redirect('/panel');
}
export async function cerrarSesion() {
  const cliente = await crearClienteServidor();
  if (cliente) await cliente.auth.signOut();
  redirect('/acceso');
}
