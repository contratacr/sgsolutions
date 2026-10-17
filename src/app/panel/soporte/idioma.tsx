import {getLocale,getTranslations} from 'next-intl/server';
import {cambiarIdioma} from '@/app/acciones-idioma';
export async function IdiomaSoporte(){
 const idioma=await getLocale(),t=await getTranslations('Navegacion');
 return <form action={cambiarIdioma} className="gestion-soporte-idioma" aria-label={t('seleccionarIdioma')}>{(['es','en'] as const).map(opcion=><button key={opcion} name="idioma" value={opcion} lang={opcion} aria-pressed={idioma===opcion} aria-label={t(opcion==='es'?'espanol':'ingles')}>{opcion.toUpperCase()}</button>)}</form>;
}
