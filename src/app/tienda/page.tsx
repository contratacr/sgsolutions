import {getLocale,getTranslations} from 'next-intl/server';

import {popularidadCatalogo} from '@/lib/popularidad-catalogo';
import {Catalogo} from '@/components/catalogo';
import {leerCatalogoPublico} from '@/lib/catalogo-servidor';
import {consultarCatalogo} from '@/lib/catalogo-consulta';
export async function generateMetadata(){const t=await getTranslations('Navegacion'),a=await getTranslations('Asesoria');return {title:t('tienda'),description:a('metaDescripcion')};}
export default async function Soluciones({searchParams}:{searchParams:Promise<{categoria?:string}>}){const {categoria}=await searchParams;const categoriaInicial=categoria==='soluciones-empresariales'?categoria:'todos';const idioma=await getLocale();const catalogo=await leerCatalogoPublico();const inicial=consultarCatalogo(catalogo,new URLSearchParams({idioma,categoria:categoriaInicial}),await popularidadCatalogo());return <main id="contenido" className="tienda-compacta"><div className="contenedor"><Catalogo key={idioma+categoriaInicial} inicial={inicial} categoriaInicial={categoriaInicial}/></div></main>;}
