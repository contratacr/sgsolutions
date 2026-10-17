import {IdiomaSoporte} from '../idioma';
import {resumenSoporteLocal} from '@/lib/soporte-local';
import Link from 'next/link';
import {getLocale,getTranslations} from 'next-intl/server';
import {accesoSoporte} from '@/lib/soporte-servidor';
import {entidadesSoporte} from '@/lib/soporte-modelo';
export async function generateMetadata(){const t=await getTranslations('SoportePanel');return {title:t('reportes'),robots:{index:false,follow:false}};}
export default async function Reportes(){
 const t=await getTranslations('SoportePanel'),idioma=await getLocale();
 let resumen:{pendientes:number;enProceso:number;programados:number;meses:{mes:string;cantidad:number}[]}|null=null;
 try{const acceso=await accesoSoporte();if(acceso.local)resumen=await resumenSoporteLocal();else{const r=await acceso.cliente.rpc('resumen_soporte');if(!r.error)resumen=r.data;}}catch{}
 return <main id="contenido" className="contenedor seccion gestion-soporte-panel"><p className="etiqueta">{t('titulo')}</p><h1>{t('reportes')}</h1><p>{t('resumenAyuda')}</p><nav className="gestion-soporte-tabs" aria-label={t('secciones')}>{entidadesSoporte.map(e=><Link key={e} href={'/panel/soporte?tipo='+e}>{t(e)}</Link>)}<Link href="/panel/soporte/reportes" aria-current="page">{t('reportes')}</Link></nav>
 {!resumen?<p role="alert" className="panel-aviso">{t('noDisponible')}</p>:<><div className="gestion-soporte-indicadores">{(['pendientes','enProceso','programados'] as const).map(k=><article key={k}><span>{t(k)}</span><strong>{resumen![k]}</strong></article>)}</div><h2>{t('porMes')}</h2><table className="gestion-soporte-reporte"><thead><tr><th scope="col">{t('mes')}</th><th scope="col">{t('cantidad')}</th></tr></thead><tbody>{resumen.meses.map(m=><tr key={m.mes}><th scope="row">{new Intl.DateTimeFormat(idioma==='en'?'en-US':'es-CR',{month:'long',year:'numeric',timeZone:'America/Costa_Rica'}).format(new Date(m.mes+'-15T12:00:00Z'))}</th><td>{m.cantidad}</td></tr>)}</tbody></table></>}
 <IdiomaSoporte/></main>;
}
