import {getTranslations} from 'next-intl/server';
import {redirect} from 'next/navigation';
import {FormularioAcceso} from '@/components/formulario-acceso';
import {configuracionSupabase} from '@/lib/supabase/configuracion';
import {adminLocalDisponible,sesionLocal} from '@/lib/admin-local';
export const metadata={robots:{index:false,follow:false}};
export default async function Admin(){
 if(await sesionLocal())redirect('/panel');
 const t=await getTranslations('Acceso');
 const local=await adminLocalDisponible();
 const disponible=local||!!configuracionSupabase();
 return <main id="contenido" className="acceso"><section className="acceso-tarjeta"><p className="etiqueta">{t('etiqueta')}</p><h1>{t('titulo')}</h1><p>{t('descripcion')}</p>{disponible?<FormularioAcceso/>:<p className="aviso-formulario" role="status">{t('noDisponible')}</p>}</section></main>;
}
