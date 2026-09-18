import {PaginaLegal} from '@/components/pagina-legal';
import {getTranslations} from 'next-intl/server';
export async function generateMetadata(){const t=await getTranslations('Legal');return {title:t('terminos.titulo'),description:t('terminos.descripcion')};}
export default function Page(){return <PaginaLegal tipo="terminos"/>;}
