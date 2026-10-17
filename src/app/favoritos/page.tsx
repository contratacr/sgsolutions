import {getTranslations} from 'next-intl/server';
import {FavoritosCuenta} from '@/components/favoritos-cuenta';
export async function generateMetadata(){const t=await getTranslations('AccionesProducto');return {title:t('favoritos'),robots:{index:false,follow:false}};}
export default function Favoritos(){return <main id="contenido" className="contenedor seccion tienda-compacta favoritos-pagina"><FavoritosCuenta pagina/></main>;}
