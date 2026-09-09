import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { cerrarSesion } from '@/app/acceso/acciones';
export const metadata = {robots: {index: false, follow: false}};
export default async function Panel() {
  const cliente = await crearClienteServidor();
  if (!cliente) redirect('/acceso');
  const {data: {user}} = await cliente.auth.getUser();
  if (!user) redirect('/acceso');
  const {data: perfil} = await cliente.from('perfiles').select('id,rol,activo').eq('id', user.id).eq('activo', true).maybeSingle();
  const acceso = await getTranslations('Acceso');
  if (!perfil) return <main id="contenido" className="contenedor seccion"><h1>{acceso('sinPermiso')}</h1><form action={cerrarSesion}><button className="boton boton-azul">{acceso('salir')}</button></form></main>;
  const t = await getTranslations('Panel');
  const modulos = perfil.rol === 'administrador' ? ['clientes','cotizaciones','pedidos','productos','ajustes'] : ['clientes','cotizaciones','pedidos'];
  return <main id="contenido" className="contenedor seccion"><div className="panel-cabecera"><h1>{t('titulo')}</h1><form action={cerrarSesion}><button className="boton boton-contorno">{acceso('salir')}</button></form></div><p>{t('descripcion')}</p><div className="panel-grid">{modulos.map(modulo => <article key={modulo}><h2>{t(modulo)}</h2><p>{t(`${modulo}Detalle`)}</p><span>{t('pendiente')}</span></article>)}</div></main>;
}
