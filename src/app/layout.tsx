import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { Cabecera } from '@/components/cabecera';
import { Pie } from '@/components/pie';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Marca');
  return { title: {default: t('nombre'), template: `%s | ${t('nombre')}`}, description: t('descripcion') };
}
export default async function DisenoRaiz({children}: {children: React.ReactNode}) {
  const t = await getTranslations('Navegacion');
  const idioma = await getLocale();
  return <html lang={idioma}><body><NextIntlClientProvider><a className="saltar" href="#contenido">{t('saltar')}</a><Cabecera/>{children}<Pie/></NextIntlClientProvider></body></html>;
}
