import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getTranslations} from 'next-intl/server';
import {leerBaseImportacion} from './acciones';
import {ImportadorIntcomex} from '@/components/importador-intcomex';
export const metadata={robots:{index:false,follow:false}};
export default async function Importar(){
 const base=await leerBaseImportacion().catch(()=>null);if(!base)redirect('/admin');
 const t=await getTranslations('AdminImportacion');
 return <main id="contenido" className="contenedor seccion"><Link href="/panel/catalogo">← {t('volver')}</Link><h1>{t('titulo')}</h1><ImportadorIntcomex categorias={base.catalogo.categorias} fecha={base.catalogo.sincronizacion?.fecha}/></main>;
}
