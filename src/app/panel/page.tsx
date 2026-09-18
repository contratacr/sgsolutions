import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { cerrarSesion } from '@/app/acceso/acciones';
import {sesionLocal} from '@/lib/admin-local';
export const metadata = {robots: {index: false, follow: false}};
export default async function Panel() {
  const cliente = await crearClienteServidor();
  const local=await sesionLocal();
  if (!cliente&&!local) redirect('/admin');
  const {data: {user}} = cliente?await cliente.auth.getUser():{data:{user:null}};
  if (!user&&!local) redirect('/admin');
  const {data: perfil} = local?{data:local}:await cliente!.from('perfiles').select('id,rol,activo').eq('id', user!.id).eq('activo', true).maybeSingle();
  const acceso = await getTranslations('Acceso');
  if (!perfil) return <main id="contenido" className="contenedor seccion"><h1>{acceso('sinPermiso')}</h1><form action={cerrarSesion}><button className="boton boton-azul">{acceso('salir')}</button></form></main>;
  const t = await getTranslations('Panel');
  return <main id="contenido" className="contenedor seccion panel-inicio"><div className="panel-cabecera"><div><p className="etiqueta">{acceso('etiqueta')}</p><h1>{t('titulo')}</h1><p>{local?.correo??user?.email}</p></div></div><p className="panel-descripcion">{t('descripcion')}</p>{local&&<p className="panel-aviso" role="status">{t('pruebaLocal')}</p>}{perfil.rol==='administrador'&&<div className="panel-modulos"><Link href="/panel/catalogo"><h2>{t('productos')}</h2><p>{t('productosDetalle')}</p></Link><Link href="/panel/contenido"><h2>{t('contenido')}</h2><p>{t('contenidoDetalle')}</p></Link></div>}<Link className="boton boton-contorno" href="/">{t('verSitio')}</Link></main>;
}
