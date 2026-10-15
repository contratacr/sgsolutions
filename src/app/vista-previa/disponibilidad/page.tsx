import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {getTranslations} from 'next-intl/server';
import {DisponibilidadVista} from '@/components/disponibilidad-vista';
import '../pedidos/propuesta.css';
import './disponibilidad.css';
export async function generateMetadata(){const t=await getTranslations('DisponibilidadPrueba');return {title:t('tiendaTitulo'),robots:{index:false,follow:false}};}
export default async function Pagina(){const host=(await headers()).get('host')??'';if(process.env.NODE_ENV!=='development'||process.env.SG_ENTORNO==='produccion'||!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))notFound();return <DisponibilidadVista/>;}
