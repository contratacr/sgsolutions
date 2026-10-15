'use client';
import {useState} from 'react';
import {useTranslations} from 'next-intl';
import ubicaciones from '@/lib/ubicaciones-cr.json';
import {IndicadorCampo} from './indicador-campo';
const datos:Record<string,Record<string,string[]>>=ubicaciones;
export function DireccionCompra({inicial}:{inicial:Record<string,string>}){
 const t=useTranslations('Compra');
 const [provincia,setProvincia]=useState(inicial.provincia??''),[canton,setCanton]=useState(inicial.canton??''),[distrito,setDistrito]=useState(inicial.distrito??'');
 const cantones=Object.keys(datos[provincia]??{}),distritos=datos[provincia]?.[canton]??[];
 const opciones=(valores:string[],actual:string)=>[...new Set(actual?[...valores,actual]:valores)];
 return <><label><span>{t('provincia')}<IndicadorCampo obligatorio/></span><select name="provincia" value={provincia} required onChange={e=>{setProvincia(e.target.value);setCanton('');setDistrito('');}}><option value="">{t('seleccione')}</option>{Object.keys(datos).map(v=><option key={v}>{v}</option>)}</select></label><label><span>{t('canton')}<IndicadorCampo obligatorio/></span><select name="canton" value={canton} required disabled={!provincia} onChange={e=>{setCanton(e.target.value);setDistrito('');}}><option value="">{t('seleccione')}</option>{opciones(cantones,canton).map(v=><option key={v}>{v}</option>)}</select></label><label><span>{t('distrito')}<IndicadorCampo obligatorio/></span><select name="distrito" value={distrito} required disabled={!canton} onChange={e=>setDistrito(e.target.value)}><option value="">{t('seleccione')}</option>{opciones(distritos,distrito).map(v=><option key={v}>{v}</option>)}</select></label></>;
}
