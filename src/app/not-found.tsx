import {EstadoPagina} from '@/components/estado-pagina';
import { getTranslations } from 'next-intl/server';
export default async function NoEncontrado() {
  const t = await getTranslations('Error');
  return <EstadoPagina textos={{etiqueta:t('etiqueta'),titulo:t('noEncontrado'),descripcion:t('descripcion404'),volver:t('volver'),tienda:t('tienda'),reintentar:t('reintentar')}}/>;
}
