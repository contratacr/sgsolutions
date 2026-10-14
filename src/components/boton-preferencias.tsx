'use client';
import {abrirPreferenciasMedicion} from '@/lib/preferencias-medicion';

import {useSyncExternalStore} from 'react';
const suscribir=()=>()=>{};
const disponible=()=>true;
const servidor=()=>false;
import {useTranslations} from 'next-intl';

export function BotonPreferencias() {
  const t = useTranslations('Analitica'),listo=useSyncExternalStore(suscribir,disponible,servidor);
  return <button className="pie-preferencias" type="button" disabled={!listo} onClick={abrirPreferenciasMedicion}>{t('preferencias')}</button>;
}
