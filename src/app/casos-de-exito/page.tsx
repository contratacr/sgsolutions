import {GaleriaCaso} from '@/components/galeria-caso';
import './casos.css';
import {leerContenido} from '@/lib/contenido-servidor';
import {traducir} from '@/lib/catalogo-modelo';
import {getLocale,getTranslations} from 'next-intl/server';
import {ArrowUpRight} from 'lucide-react';
import {enlaceWhatsApp} from '@/lib/empresa';

export async function generateMetadata(){
 const t=await getTranslations('Casos');
 return {title:t('etiqueta'),description:t('descripcion')};
}
export default async function Casos(){
 const t=await getTranslations('Casos');
 const n=await getTranslations('Navegacion');
 const idioma=await getLocale();
 const casos=(await leerContenido()).casos.filter(c=>c.publicado);
 return <main id="contenido" className="casos-pagina historias">
  <header className="contenedor casos-intro"><p className="etiqueta">{t('etiqueta')}</p><h1>{t('titulo')}</h1><p>{t('descripcion')}</p></header>
  <section className="contenedor casos-lista" aria-label={t('galeria')}>
   {casos.map((c,i)=><article className="caso" key={c.id}>
    <div className="historia-cabecera"><div><p className="historia-categoria"><span>0{i+1}</span>{traducir(c.categoria,idioma)}</p><h2>{c.cliente}</h2><h3>{traducir(c.titulo,idioma)}</h3></div><p className="historia-descripcion">{traducir(c.descripcion,idioma)}</p></div>
    <GaleriaCaso cliente={c.cliente} fotos={c.fotos.map(f=>({src:f.src,alt:traducir(f.alt,idioma),caption:traducir(f.caption,idioma)}))} prioridad={i===0}/>
    <div className="historia-cierre"><p>{t('solucion')}<span>{traducir(c.solucion,idioma)}</span></p><a href={enlaceWhatsApp(t('consultaCaso',{cliente:c.cliente}))} target="_blank" rel="noopener noreferrer" title={n('nuevaPestana')}>{t('similar')}<ArrowUpRight size={18}/></a></div>
   </article>)}
  </section>
  <section className="contenedor casos-cta"><div><h2>{t('ctaTitulo')}</h2><p>{t('ctaTexto')}</p></div><a className="boton boton-naranja" href={enlaceWhatsApp(t('mensaje'))} target="_blank" rel="noopener noreferrer" title={n('nuevaPestana')}>{t('cta')}<ArrowUpRight size={18}/></a></section>
 </main>;
}
