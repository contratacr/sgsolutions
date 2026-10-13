import {getLocale,getTranslations} from 'next-intl/server';
import {recomendaciones} from '@/lib/recomendaciones';
import {Catalogo} from '@/components/catalogo';
import {leerCatalogoPublico} from '@/lib/catalogo-servidor';
import {consultarCatalogo} from '@/lib/catalogo-consulta';
export async function generateMetadata(){const t=await getTranslations('Navegacion'),a=await getTranslations('Asesoria');return {title:t('tienda'),description:a('metaDescripcion')};}
export default async function Soluciones(){const idioma=await getLocale();const catalogo=await leerCatalogoPublico();const inicial=consultarCatalogo(catalogo,new URLSearchParams({idioma}));return <main id="contenido" className="tienda-compacta"><div className="contenedor"><Catalogo key={idioma} inicial={inicial} recomendacionesIniciales={recomendaciones(catalogo.productos)}/></div></main>;}
