import Link from 'next/link';
import {ShieldCheck} from 'lucide-react';
import {getTranslations} from 'next-intl/server';

export async function AccesoDenegado({error=false}:{error?:boolean}){
 const t=await getTranslations('AdministracionCuenta');
 return <main id="contenido" className="contenedor seccion acceso-denegado"><section className="cuenta-bloque"><ShieldCheck size={32} aria-hidden="true"/><h1>{t(error?'errorTitulo':'sinPermisoTitulo')}</h1><p role={error?'alert':undefined}>{t(error?'errorDetalle':'sinPermisoDetalle')}</p><Link href="/cuenta" className="boton boton-azul">{t('volver')}</Link></section></main>;
}
