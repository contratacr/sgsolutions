import {getLocale,getTranslations} from 'next-intl/server';
import {Catalogo} from '@/components/catalogo';
export async function generateMetadata(){const t=await getTranslations('Navegacion');return {title:t('tienda')};}
export default async function Tienda(){const idioma=await getLocale();return <main id="contenido" className="tienda-compacta"><div className="contenedor"><Catalogo key={idioma}/></div></main>;}
