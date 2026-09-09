import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { empresa } from '@/lib/empresa';

export async function Pie() {
  const t = await getTranslations('Pie');
  const marca = await getTranslations('Marca');
  const n = await getTranslations('Navegacion');
  return <footer className="pie"><div className="contenedor pie-grid"><div><Image src="/imagenes/logo-blanco.png" alt={marca('logo')} width={144} height={61}/><p>{t('frase')}</p></div><div><h3>{t('direccionTitulo')}</h3><p>{marca('direccion')}</p></div><div><h3>{t('contactoTitulo')}</h3><a href={`tel:${empresa.telefono}`}>{marca('telefono')}</a><a href={`mailto:${empresa.correo}`}>{marca('correo')}</a></div></div><div className="contenedor pie-base"><span>{t('derechos', {anio: 2026})}</span><Link href="/acceso">{n('acceso')}</Link></div></footer>;
}
