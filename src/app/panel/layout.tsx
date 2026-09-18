import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import {cerrarSesion} from '@/app/acceso/acciones';
export default async function DisenoPanel({children}:{children:React.ReactNode}){
 const t=await getTranslations('Panel');
 const a=await getTranslations('Acceso');
 return <><nav className="panel-navegacion contenedor" aria-label={t('titulo')}><Link href="/panel">{t('titulo')}</Link><Link href="/panel/catalogo">{t('productos')}</Link><Link href="/panel/contenido">{t('contenido')}</Link><form action={cerrarSesion} data-cerrar-sesion><button className="boton boton-contorno">{a('salir')}</button></form></nav>{children}</>;
}
