import {getLocale,getTranslations} from 'next-intl/server';
import {Catalogo} from '@/components/catalogo';
export async function generateMetadata(){const t=await getTranslations('Navegacion'),a=await getTranslations('Asesoria');return {title:t('tienda'),description:a('metaDescripcion')};}
export default async function Soluciones(){const idioma=await getLocale();return <main id="contenido" className="tienda-compacta"><div className="contenedor"><Catalogo key={idioma}/></div></main>;}
