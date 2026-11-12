import {getLocale,getTranslations} from 'next-intl/server';
import {LogOut} from 'lucide-react';
import {cambiarIdioma} from '@/app/acciones-idioma';
import {cerrarSesion} from '@/app/acceso/acciones';

/** Account block of the administrative shell: who is signed in, site language and sign-out, reachable from every module. */
export async function CuentaPanelAdmin({correo}:{correo?:string|null}){
 const idioma=await getLocale(),t=await getTranslations('Panel'),n=await getTranslations('Navegacion'),a=await getTranslations('Acceso');
 return <div className="panel-nav-cuenta">{correo&&<p><span>{t('sesionIniciada')}</span><strong title={correo}>{correo}</strong></p>}<form action={cambiarIdioma} className="panel-nav-idioma" aria-label={n('seleccionarIdioma')}>{(['es','en'] as const).map(opcion=><button key={opcion} name="idioma" value={opcion} lang={opcion} aria-pressed={idioma===opcion} aria-label={n(opcion==='es'?'espanol':'ingles')}>{opcion.toUpperCase()}</button>)}</form><form action={cerrarSesion}><button className="panel-nav-salir"><LogOut size={16} aria-hidden="true"/>{a('salir')}</button></form></div>;
}
