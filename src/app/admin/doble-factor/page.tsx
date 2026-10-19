import {getTranslations} from 'next-intl/server';
import {redirect} from 'next/navigation';
import {leerAccesoPanel} from '@/lib/acceso-panel';
import {crearClienteServidor} from '@/lib/supabase/servidor';
import {AccesoDenegado} from '@/components/acceso-denegado';
import {FormularioMfa} from '@/components/formulario-mfa';
export async function generateMetadata(){const t=await getTranslations('MfaAdmin');return {title:t('titulo'),robots:{index:false,follow:false}};}
export default async function DobleFactor(){
 const acceso=await leerAccesoPanel();
 if(acceso==='administrador')redirect('/panel');
 if(acceso==='sinSesion')redirect('/admin');
 if(acceso!=='mfa')return <AccesoDenegado error={acceso==='error'}/>;
 const cliente=await crearClienteServidor();
 const factores=await cliente!.auth.mfa.listFactors();
 if(factores.error)return <AccesoDenegado error/>;
 const t=await getTranslations('MfaAdmin');const verificados=factores.data.totp;
 return <main id="contenido" className="acceso"><section className="acceso-tarjeta mfa-admin"><p className="etiqueta">{t('etiqueta')}</p><h1>{t('titulo')}</h1><p>{t(verificados.length?'verificarDescripcion':'configurarDescripcion')}</p><FormularioMfa factores={verificados.map(f=>({id:f.id,nombre:f.friendly_name||t('autenticador')}))}/></section></main>;
}
