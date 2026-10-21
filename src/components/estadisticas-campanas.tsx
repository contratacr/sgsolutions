import {getTranslations} from 'next-intl/server';
import {crearClienteServidor} from '@/lib/supabase/servidor';
import {configuracionMeta} from '@/lib/publicidad-servidor';
import {procesarMedicionPanel} from '@/app/panel/estadisticas/acciones';
type Fila={tipo:string;cantidad:number;canal:string;medio:string;campana:string;primer_canal:string;primera_campana:string};
export async function EstadisticasCampanas({dias}:{dias:7|30}){
 const t=await getTranslations('MedicionCampanas'),db=await crearClienteServidor();
 const r=db?await db.rpc('resumen_campanas_panel',{dias}):null;
 if(!r||r.error||!r.data||!Array.isArray(r.data.campanas)||!Array.isArray(r.data.embudo)||!Array.isArray(r.data.meta))return <section className="estadisticas-lista"><h2>{t('titulo')}</h2><p>{t('pendienteMigracion')}</p></section>;
 const filas=r.data.campanas as Fila[],embudo=r.data.embudo as {tipo:string;cantidad:number}[],meta=r.data.meta as {estado:string;cantidad:number}[];
 const etiqueta=(clave:string)=>t.has(clave)?t(clave):clave;
 return <section className="estadisticas-campanas"><h2>{t('titulo')}</h2><p>{t('alcance')}</p>
  <div className="estadisticas-tarjetas">{['solicitud_recibida','cotizacion_preparada','pedido_creado','pago_confirmado'].map(tipo=><article key={tipo}><span>{etiqueta(tipo)}</span><strong>{embudo.find(f=>f.tipo===tipo)?.cantidad??0}</strong></article>)}</div>
  <h3>{t('campanas')}</h3>{filas.length?<div className="estadisticas-tabla-scroll" tabIndex={0} role="region" aria-label={t('campanas')}><table><thead><tr>{['origen','medio','campana','primero','accion','cantidad'].map(k=><th key={k} scope="col">{t(k)}</th>)}</tr></thead><tbody>{filas.map((f,i)=><tr key={i}><td>{etiqueta(f.canal)}</td><td>{etiqueta(f.medio)}</td><td>{f.campana||'—'}</td><td>{etiqueta(f.primer_canal)}{f.primera_campana&&<> · {f.primera_campana}</>}</td><td>{etiqueta(f.tipo)}</td><td>{f.cantidad}</td></tr>)}</tbody></table></div>:<p>{t('sinDatos')}</p>}
  <h3>{t('meta')}</h3><p>{t(configuracionMeta()?'configurada':'desactivada')}</p><p>{t('recepcion')}</p>
  <ul className="estadisticas-meta-estados">{['pendiente','enviando','aceptado','suprimido','expirado'].map(estado=><li key={estado}><span>{etiqueta(estado)}</span><strong>{meta.find(f=>f.estado===estado)?.cantidad??0}</strong></li>)}</ul>
  <form action={procesarMedicionPanel}><button className="boton boton-contorno">{t('procesar')}</button></form>
 </section>;
}
