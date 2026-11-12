import {getLocale,getTranslations} from 'next-intl/server';
import {exigirAdminMfa} from '@/lib/acceso-panel';
import {baseMedicion} from '@/lib/medicion-servidor';
import {fechasAnalitica} from '@/lib/analitica-servidor';
import {etapasContacto,fuentesContacto,type ContactoGuardado} from '@/lib/contactos-comerciales-modelo';
import {ContactoComercialFormulario} from './contacto-comercial-formulario';
export async function ContactosComerciales({dias}:{dias:0|7|30}){
 await exigirAdminMfa();const t=await getTranslations('ContactosComerciales'),a=await getTranslations('Analitica'),idioma=(await getLocale())==='en'?'en-US':'es-CR';
 const formato=new Intl.NumberFormat(idioma),numero=(n:number)=>formato.format(n),dia=(fecha:string)=>new Intl.DateTimeFormat(idioma,{dateStyle:'medium',timeZone:'UTC'}).format(new Date(fecha+'T12:00:00Z'));
 const fechas=fechasAnalitica(dias||1),hoy=fechas.at(-1)!;const db=baseMedicion();
 const r=db?await db.from('contactos_comerciales').select('*').gte('fecha',dias===0?'0001-01-01':fechas[0]).lte('fecha',hoy).order('fecha',{ascending:false}).order('id').limit(501):null;
 const filas=(r?.data??[]) as ContactoGuardado[],disponible=Boolean(r&&!r.error),reales=filas.filter(f=>!f.prueba),limitado=filas.length>500;
 return <section id="contactos-comerciales" className="estadisticas-campanas" aria-labelledby="contactos-comerciales-titulo"><h2 id="contactos-comerciales-titulo">{t('titulo')}</h2>
 <div className="estadisticas-explicacion"><p>{t('detalle')}</p><p>{t('criterio')}</p><p>{t('ventasNota')}</p><p>{t('costoNota')}</p></div>
 {!disponible?<div className="estadisticas-error" role="alert"><strong>{a('noDisponible')}</strong><p>{t('error')}</p></div>:<div className="estadisticas-datos">
 {limitado?<div className="estadisticas-error" role="alert"><p>{t('limite')}</p></div>:<div className="estadisticas-tarjetas">{etapasContacto.map(etapa=><article key={etapa}><span>{t(etapa)}</span><strong>{numero(reales.filter(f=>f.etapa===etapa).length)}</strong></article>)}</div>}
 {!limitado&&<div className="estadisticas-tabla-scroll" tabIndex={0} role="region" aria-label={t('porOrigen')}><table><caption>{t('porOrigen')}</caption><thead><tr><th scope="col">{t('fuente')}</th>{etapasContacto.map(e=><th key={e} scope="col">{t(e)}</th>)}</tr></thead><tbody>{fuentesContacto.map(f=><tr key={f}><th scope="row">{t(f)}</th>{etapasContacto.map(e=><td key={e}>{numero(reales.filter(c=>c.fuente===f&&c.etapa===e).length)}</td>)}</tr>)}</tbody></table></div>}
 <details><summary>{t('nuevo')}</summary><ContactoComercialFormulario hoy={hoy} id={crypto.randomUUID()}/></details>
 <div className="contactos-lista">{filas.slice(0,500).map(f=><details key={f.id}><summary>{f.referencia} · {dia(f.fecha)} · {t(f.etapa)} · {t(f.fuente)}{f.prueba?` · ${t('excluido')}`:''}</summary><ContactoComercialFormulario key={f.id+':'+f.revision} contacto={f} hoy={hoy} id={f.id}/></details>)}</div>
 {!filas.length&&<p>{t('sinDatos')}</p>}
 </div>}
 <h3>{t('traficoTitulo')}</h3><p>{t('traficoDetalle')}</p>
 </section>;
}
