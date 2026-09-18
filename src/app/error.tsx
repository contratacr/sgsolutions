'use client';
import {useTranslations} from 'next-intl';
import {EstadoPagina} from '@/components/estado-pagina';
export default function ErrorPagina({retry}:{error:Error & {digest?:string};retry:()=>void}){
 const t=useTranslations('Error');
 return <EstadoPagina codigo="!" reintentar={retry} textos={{etiqueta:t('etiqueta'),titulo:t('titulo'),descripcion:t('descripcion'),volver:t('volver'),tienda:t('tienda'),reintentar:t('reintentar')}}/>;
}
