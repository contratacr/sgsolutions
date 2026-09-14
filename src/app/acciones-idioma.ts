'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
export async function cambiarIdioma(datos: FormData) {
  const idioma = datos.get('idioma');
  if (idioma !== 'es' && idioma !== 'en') return;
  (await cookies()).set('sg-idioma', idioma, {httpOnly: true, sameSite: 'lax', secure: process.env.SG_ENTORNO === 'produccion', maxAge: 31536000, path: '/'});
  revalidatePath('/', 'layout');
}
