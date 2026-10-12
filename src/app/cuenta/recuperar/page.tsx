import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { crearClienteCuenta } from '@/lib/supabase/cuenta';
import { FormularioNuevaClave } from '../formulario';
import '../cuenta.css';
export async function generateMetadata(){const t=await getTranslations('CuentaCliente');return {title:t('nuevaClave'),robots:{index:false,follow:false}};}
export default async function RecuperarCuenta(){
  const cliente=await crearClienteCuenta();
  const usuario=cliente?(await cliente.auth.getUser()).data.user:null;
  if(!usuario||(await cookies()).get('sg-recuperacion')?.value!==usuario.id)redirect('/cuenta?error=acceso');
  const t=await getTranslations('CuentaCliente');
  return <main id="contenido" className="contenedor seccion cuenta-pagina"><div className="cuenta-intro"><h1>{t('nuevaClave')}</h1></div><section className="cuenta-bloque"><FormularioNuevaClave/></section></main>;
}
