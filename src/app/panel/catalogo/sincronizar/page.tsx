import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getTranslations} from 'next-intl/server';
import {leerBaseImportacion} from '../importar/acciones';
import {productosVinculados} from '@/lib/intcomex/sesion';
import {SincronizadorIntcomex} from '@/components/sincronizador-intcomex';
export async function generateMetadata(){const t=await getTranslations('AdminSincronizacion');return {title:t('titulo'),robots:{index:false,follow:false}};}
export default async function Sincronizar(){
 const base=await leerBaseImportacion().catch(()=>null);if(!base)redirect('/admin');const t=await getTranslations('AdminSincronizacion');
 return <main id="contenido" className="contenedor seccion"><Link href="/panel/catalogo">← {t('volver')}</Link><h1>{t('titulo')}</h1><SincronizadorIntcomex productos={productosVinculados(base.catalogo)} revision={base.revision}/></main>;
}
