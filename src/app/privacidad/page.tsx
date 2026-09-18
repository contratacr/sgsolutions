import {PaginaLegal} from '@/components/pagina-legal';
import {getTranslations} from 'next-intl/server';
export async function generateMetadata(){const t=await getTranslations('Legal');return {title:t('privacidad.titulo'),description:t('privacidad.descripcion')};}
export default function Page(){return <PaginaLegal tipo="privacidad"/>;}
