'use client';

import {useTranslations} from 'next-intl';

export function BotonPreferencias() {
  const t = useTranslations('Analitica');
  return <button className="pie-preferencias" type="button" onClick={() => window.dispatchEvent(new Event('sg-abrir-preferencias'))}>{t('preferencias')}</button>;
}
