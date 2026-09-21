import {getTranslations} from 'next-intl/server';
import {ActivarAdmin} from '@/components/activar-admin';
export async function generateMetadata(){const t=await getTranslations('Activacion');return {title:t('titulo'),robots:{index:false,follow:false},referrer:'no-referrer' as const};}
export default function Pagina(){return <ActivarAdmin/>;}
