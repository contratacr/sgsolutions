'use client';
import {useTranslations} from 'next-intl';

export function IndicadorCampo({obligatorio=false}:{obligatorio?:boolean}){
 const t=useTranslations('CamposFormulario');
 return <span className={`campo-requisito${obligatorio?' campo-obligatorio':''}`} aria-hidden={obligatorio?true:undefined}>{obligatorio?' *':` ${t('opcional')}`}</span>;
}
