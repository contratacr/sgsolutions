import {getTranslations} from 'next-intl/server';
import {EsqueletoPanel} from '@/components/esqueletos';
export default async function Cargando(){
 const t=await getTranslations('Error');
 return <EsqueletoPanel texto={t('cargando')}/>;
}
