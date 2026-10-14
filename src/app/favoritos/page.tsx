import {getTranslations} from 'next-intl/server';
import {FavoritosCuenta} from '@/components/favoritos-cuenta';
import Link from 'next/link';
import {crearClienteCuenta} from '@/lib/supabase/cuenta';
export async function generateMetadata(){const t=await getTranslations('AccionesProducto');return {title:t('favoritos'),robots:{index:false,follow:false}};}
export default async function Favoritos(){const t=await getTranslations('AccionesProducto');const cliente=await crearClienteCuenta();const user=cliente?(await cliente.auth.getUser()).data.user:null;return <main id="contenido" className="contenedor seccion tienda-compacta favoritos-pagina"><h1 className="sr-only">{t('favoritos')}</h1>{!user&&<p className="favoritos-invitado">{t('invitado')} <Link href="/cuenta">{t('ingresar')}</Link></p>}<FavoritosCuenta/></main>;}
