import {leerContenido} from '@/lib/contenido-servidor';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {getTranslations} from 'next-intl/server';
import {CompraEnlacePrueba} from '@/components/disponibilidad-vista';
import '../../pedidos/propuesta.css';
import '../../disponibilidad/disponibilidad.css';
export async function generateMetadata(){const t=await getTranslations('DisponibilidadPrueba');return {title:t('compraTitulo'),robots:{index:false,follow:false},referrer:'no-referrer' as const};}
export default async function Pagina({params}:{params:Promise<{token:string}>}){const host=(await headers()).get('host')??'';if(process.env.NODE_ENV!=='development'||process.env.SG_ENTORNO==='produccion'||!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))notFound();const {token}=await params;if(!/^(?:[a-f0-9-]{36}|[a-f0-9]{16})$/.test(token))notFound();const {pagos}=await leerContenido();return <CompraEnlacePrueba key={token} token={token} pagos={pagos}/>;}
