'use client';
import {abrirPreferenciasMedicion} from '@/lib/preferencias-medicion';

import {useTranslations} from 'next-intl';

export function BotonPreferencias() {
  const t = useTranslations('Analitica');
  return <button className="pie-preferencias" type="button" onClick={abrirPreferenciasMedicion}>{t('preferencias')}</button>;
}
