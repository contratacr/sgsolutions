import {getTranslations} from 'next-intl/server';
import {exigirAdminMfa} from '@/lib/acceso-panel';
import {baseMedicion} from '@/lib/medicion-servidor';
import {fechasAnalitica} from '@/lib/analitica-servidor';
import {etapasContacto,fuentesContacto,type ContactoGuardado} from '@/lib/contactos-comerciales-modelo';
import {ContactoComercialFormulario} from './contacto-comercial-formulario';
export async function ContactosComerciales({dias}:{dias:0|7|30}){
 await exigirAdminMfa();const t=await getTranslations('ContactosComerciales');
 const fechas=fechasAnalitica(dias||1),hoy=fechas.at(-1)!;const db=baseMedicion();
 const r=db?await db.from('contactos_comerciales').select('*').gte('fecha',dias===0?'0001-01-01':fechas[0]).lte('fecha',hoy).order('fecha',{ascending:false}).order('id').limit(501):null;
 const filas=(r?.data??[]) as ContactoGuardado[],disponible=Boolean(r&&!r.error),reales=filas.filter(f=>!f.prueba),limitado=filas.length>500;
 return <section className="estadisticas-campanas"><h2>{t('titulo')}</h2><p>{t('detalle')}</p><p>{t('criterio')}</p>
 {!disponible?<p role="alert">{t('error')}</p>:<>
 {limitado?<p role="alert">{t('limite')}</p>:<div className="estadisticas-tarjetas">{etapasContacto.map(etapa=><article key={etapa}><span>{t(etapa)}</span><strong>{reales.filter(f=>f.etapa===etapa).length}</strong></article>)}</div>}
 {!limitado&&<div className="estadisticas-tabla-scroll"><table><caption>{t('porOrigen')}</caption><thead><tr><th>{t('fuente')}</th>{etapasContacto.map(e=><th key={e}>{t(e)}</th>)}</tr></thead><tbody>{fuentesContacto.map(f=><tr key={f}><th scope="row">{t(f)}</th>{etapasContacto.map(e=><td key={e}>{reales.filter(c=>c.fuente===f&&c.etapa===e).length}</td>)}</tr>)}</tbody></table></div>}
 <p>{t('ventasNota')}</p><p>{t('costoNota')}</p>
 <details><summary>{t('nuevo')}</summary><ContactoComercialFormulario hoy={hoy} id={crypto.randomUUID()}/></details>
 <div className="contactos-lista">{filas.slice(0,500).map(f=><details key={f.id}><summary>{f.referencia} · {f.fecha} · {t(f.etapa)} · {t(f.fuente)}{f.prueba?` · ${t('excluido')}`:''}</summary><ContactoComercialFormulario key={f.id+':'+f.revision} contacto={f} hoy={hoy} id={f.id}/></details>)}</div>
 {!filas.length&&<p>{t('sinDatos')}</p>}
 </>}
 <h3>{t('traficoTitulo')}</h3><p>{t('traficoDetalle')}</p>
 </section>;
}
