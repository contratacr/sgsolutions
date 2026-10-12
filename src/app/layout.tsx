import {cookies} from 'next/headers';
import {crearClienteCuenta} from '@/lib/supabase/cuenta';
import {Medicion} from '@/components/medicion';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { Cabecera } from '@/components/cabecera';
import { Pie } from '@/components/pie';
import {FocoInteraccion} from '@/components/foco-interaccion';
import {DatosCatalogo} from '@/components/datos-catalogo';
import {resumenCatalogo,consultarCatalogo} from '@/lib/catalogo-consulta';
import {leerCatalogoPublico} from '@/lib/catalogo-servidor';
import './globals.css';
import './refinamiento.css';
import './entrada.css';
import './tienda.css';
import './acabado.css';
import './marcas.css';
import './solicitud.css';
import './movimiento-visual.css';
import './estados.css';
import './admin.css';
import './revision-visual.css';
import {RevelarScroll} from '@/components/revelar-scroll';
import {META_PIXEL_ID} from '@/lib/meta-pixel';
import {ValidacionNativa} from '@/components/validacion-nativa';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Marca');
  return { title: {default: t('nombre'), template: `%s | ${t('nombre')}`}, description: t('descripcion') };
}
export default async function DisenoRaiz({children}: {children: React.ReactNode}) {
  const t = await getTranslations('Navegacion');
  const idioma = await getLocale();
  const catalogo = await leerCatalogoPublico();
  let sesionIniciada=false;
  if((await cookies()).getAll().some(c=>/^sb-.*-auth-token(?:\.\d+)?$/.test(c.name))){
    try{const cliente=await crearClienteCuenta();sesionIniciada=Boolean((await cliente?.auth.getUser())?.data.user);}catch{/* La navegación pública sigue disponible si Auth no responde. */}
  }
  return <html lang={idioma}><body><FocoInteraccion/><RevelarScroll/><NextIntlClientProvider><ValidacionNativa/><DatosCatalogo datos={{...resumenCatalogo(catalogo),productos:consultarCatalogo(catalogo,new URLSearchParams()).productos}}><a className="saltar" href="#contenido">{t('saltar')}</a><Cabecera sesionIniciada={sesionIniciada}/>{children}<Pie/><Medicion pixel={META_PIXEL_ID}/></DatosCatalogo></NextIntlClientProvider></body></html>;
}
