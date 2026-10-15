import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {getLocale,getTranslations} from 'next-intl/server';
import {ejemplosCorreo} from '@/lib/email/ejemplos';
import {VistaCorreos} from '@/components/vista-correos';
import './correos.css';
export async function generateMetadata(){const t=await getTranslations('VistaCorreos');return {title:t('titulo'),robots:{index:false,follow:false}};}
export default async function Pagina(){
 const host=(await headers()).get('host')??'';
 if(process.env.NODE_ENV!=='development'||process.env.SG_ENTORNO==='produccion'||!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))notFound();
 const idioma=(await getLocale())==='en'?'en':'es';
 return <VistaCorreos ejemplos={ejemplosCorreo(idioma)}/>;
}
