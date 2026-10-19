import {exigirAdminMfa} from '@/lib/acceso-panel';
import {IdiomaSoporte} from './idioma';
import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import {entidadesSoporte} from '@/lib/soporte-modelo';
import {adminLocalDisponible} from '@/lib/admin-local';
import {leerSoporte} from '@/lib/soporte-servidor';
import {GestionSoporte} from './gestion';
export async function generateMetadata(){const t=await getTranslations('SoportePanel');return {title:t('titulo'),robots:{index:false,follow:false}};}
export default async function Soporte({searchParams}:{searchParams:Promise<{tipo?:string;q?:string;archivados?:string;pagina?:string}>}){
 await exigirAdminMfa();
 const t=await getTranslations('SoportePanel'),p=await searchParams,local=await adminLocalDisponible();
 const tipo=entidadesSoporte.find(e=>e===p.tipo)??'tickets',q=typeof p.q==='string'?p.q.trim().slice(0,100):'',archivado=p.archivados==='1',pagina=Math.max(1,Math.min(10000,Math.floor(Number(p.pagina)||1)));
 let datos;try{datos=await leerSoporte(tipo,q,archivado,pagina);}catch{}
 const ruta=(cambio:Record<string,string>)=>'/panel/soporte?'+new URLSearchParams({tipo,q,archivados:archivado?'1':'0',...cambio});
 return <main id="contenido" className="contenedor seccion gestion-soporte-panel"><div className="panel-cabecera"><div><p className="etiqueta">{t('etiqueta')}</p><h1>{t('titulo')}</h1><p>{t('descripcion')}</p></div></div>
 {local&&<p className="panel-aviso" role="status">{t('local')}</p>}
 <nav className="gestion-soporte-tabs" aria-label={t('secciones')}>{entidadesSoporte.map(e=><Link key={e} href={ruta({tipo:e,pagina:'1',q:''})} aria-current={e===tipo?'page':undefined}>{t(e)}</Link>)}<Link href="/panel/soporte/reportes">{t('reportes')}</Link></nav>
 {!datos?<div className="panel-aviso" role="alert"><h2>{t('noDisponible')}</h2><p>{t('preparacion')}</p><Link href={ruta({})}>{t('reintentar')}</Link></div>:<>
 <div className="gestion-soporte-herramientas"><form method="get" className="gestion-soporte-busqueda"><input type="hidden" name="tipo" value={tipo}/><input type="hidden" name="archivados" value={archivado?'1':'0'}/><label className="sr-only" htmlFor="soporte-q">{t('buscar')}</label><input id="soporte-q" type="search" name="q" defaultValue={q} placeholder={t('buscar')} maxLength={100}/><button className="boton boton-contorno">{t('buscarBoton')}</button></form><Link className="gestion-soporte-archivo" href={ruta({archivados:archivado?'0':'1',pagina:'1'})}>{t(archivado?'verActivos':'verArchivados')}</Link></div>
 <GestionSoporte key={`${tipo}-${archivado}`} tipo={tipo} datos={datos} archivados={archivado}/>
 <nav className="gestion-soporte-paginacion" aria-label={t('paginacion')}>{pagina>1&&<Link className="boton boton-contorno" href={ruta({pagina:String(pagina-1)})}>{t('anterior')}</Link>}<span>{t('resultados',{total:datos.total})}</span>{pagina*25<datos.total&&<Link className="boton boton-contorno" href={ruta({pagina:String(pagina+1)})}>{t('siguiente')}</Link>}</nav>
 </>}
 <IdiomaSoporte/></main>;
}
