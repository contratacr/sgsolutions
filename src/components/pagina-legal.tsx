import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import {enlaceCorreo} from '@/lib/empresa';
import '@/app/legal.css';

export async function PaginaLegal({tipo}:{tipo:'terminos'|'privacidad'}) {
 const t=await getTranslations('Legal');
 const n=await getTranslations('Navegacion');
 const m=await getTranslations('Analitica');
 const otro=tipo==='terminos'?'privacidad':'terminos';
 return <main id="contenido" className="legal-pagina contenedor">
  <header><p className="etiqueta">{t('etiqueta')}</p><h1>{t(`${tipo}.titulo`)}</h1><p>{t(`${tipo}.descripcion`)}</p><small>{t('actualizado')}</small><p className="legal-revision">{t('nota')}</p></header>
  <div className="legal-grid"><nav aria-label={t('indice')}><h2>{t('indice')}</h2>{Array.from({length:8},(_,i)=><a key={i} href={`#legal-${i}`}>{t(`${tipo}.secciones.${i}.titulo`)}</a>)}<Link href={`/${otro}`}>{t(`${otro}.titulo`)}</Link></nav>
  <article>{tipo==='privacidad'&&<section><h2>{m('tituloPanel')}</h2><p>{m('privacidadDetalle')}</p></section>}{Array.from({length:8},(_,i)=><section id={`legal-${i}`} key={i}><h2>{t(`${tipo}.secciones.${i}.titulo`)}</h2><p>{t(`${tipo}.secciones.${i}.texto`)}</p></section>)}<section><h2>{t('contacto')}</h2><a href={enlaceCorreo()} target="_blank" rel="noopener noreferrer">{t('correo')}<span className="sr-only">{n('nuevaPestana')}</span></a><p>{t('direccion')}</p></section></article></div>
 </main>;
}
