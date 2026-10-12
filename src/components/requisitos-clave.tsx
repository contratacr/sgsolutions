'use client';
import {useTranslations} from 'next-intl';
import {Circle,CheckCircle2} from 'lucide-react';
import {requisitosClave} from '@/lib/cuenta-validacion';
import './requisitos-clave.css';
export function RequisitosClave({valor}:{valor:string}){
 const t=useTranslations('RequisitosClave');
 return <ul className="clave-requisitos" aria-label={t('titulo')}>{Object.entries(requisitosClave(valor)).map(([regla,cumplido])=><li key={regla} data-cumplido={cumplido}>{cumplido?<CheckCircle2 size={16} aria-hidden="true"/>:<Circle size={16} aria-hidden="true"/>}<span>{t(regla as 'longitud')}<span className="sr-only"> · {t(cumplido?'cumplido':'pendiente')}</span></span></li>)}</ul>;
}
