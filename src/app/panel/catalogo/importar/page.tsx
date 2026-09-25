import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getTranslations} from 'next-intl/server';
import {leerBaseImportacion} from './acciones';
import {resumenSeleccion} from '@/lib/intcomex/seleccion';
import {ImportadorIntcomex} from '@/components/importador-intcomex';
export const metadata={robots:{index:false,follow:false}};
export default async function Importar({searchParams}:{searchParams:Promise<{modo?:string}>}){
 const modo=(await searchParams).modo==='inventario'?'inventario':'catalogo';
 const base=await leerBaseImportacion().catch(()=>null);if(!base)redirect('/admin');
 const t=await getTranslations('AdminImportacion');const sync=await getTranslations('AdminSincronizacion');
 return <main id="contenido" className="contenedor seccion"><Link href="/panel/catalogo">← {t('volver')}</Link><h1>{t(modo==='inventario'?'actualizarInventario':'titulo')}</h1><p><Link className="boton boton-contorno" href="/panel/catalogo/sincronizar">{sync('titulo')}</Link></p><ImportadorIntcomex categorias={base.catalogo.categorias} fecha={modo==='inventario'?[base.catalogo.inventario?.fecha,base.catalogo.sincronizacion?.fecha].filter(Boolean).sort().at(-1):base.catalogo.sincronizacion?.fecha} modoInicial={modo} seleccion={resumenSeleccion(base.catalogo)}/></main>;
}
