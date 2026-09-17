import {GaleriaCaso} from '@/components/galeria-caso';
import './casos.css';
import {getTranslations} from 'next-intl/server';
import {ArrowUpRight} from 'lucide-react';
import {enlaceWhatsApp} from '@/lib/empresa';

export async function generateMetadata(){
 const t=await getTranslations('Casos');
 return {title:t('etiqueta'),description:t('descripcion')};
}
export default async function Casos(){
 const t=await getTranslations('Casos');
 const n=await getTranslations('Navegacion');
 const casos=[
  {clave:0,imagenes:['servicentro-san-juan-exterior','servicentro-san-juan-infraestructura']},
  {clave:1,imagenes:['ecofarma-exterior','ecofarma-pos','ecofarma-gabinete']},
  {clave:2,imagenes:['eco-mini-market-instalacion','eco-mini-market-exterior','eco-mini-market-camaras']},
  {clave:3,imagenes:['hospital-veterinario-occidente-exterior','hospital-veterinario-occidente-infraestructura','hospital-veterinario-occidente-conectividad']}
 ];
 return <main id="contenido" className="casos-pagina historias">
  <header className="contenedor casos-intro"><p className="etiqueta">{t('etiqueta')}</p><h1>{t('titulo')}</h1><p>{t('descripcion')}</p></header>
  <section className="contenedor casos-lista" aria-label={t('galeria')}>
   {casos.map(({clave:i,imagenes})=><article className="caso" key={i}>
    <div className="historia-cabecera"><div><p className="historia-categoria"><span>0{i+1}</span>{t(`categoria${i}`)}</p><h2>{t(`cliente${i}`)}</h2><h3>{t(`titulo${i}`)}</h3></div><p className="historia-descripcion">{t(`texto${i}`)}</p></div>
    <GaleriaCaso cliente={t(`cliente${i}`)} fotos={imagenes.map((imagen,j)=>({src:`/imagenes/casos/${imagen}.webp`,alt:t(`alt${i}_${j}`),caption:t(`pie${i}_${j}`)}))} prioridad={i===0}/>
    <div className="historia-cierre"><p>{t('solucion')}<span>{t(`resumen${i}`)}</span></p><a href={enlaceWhatsApp(t('consultaCaso',{cliente:t(`cliente${i}`)}))} target="_blank" rel="noopener noreferrer" title={n('nuevaPestana')}>{t('similar')}<ArrowUpRight size={18}/></a></div>
   </article>)}
  </section>
  <section className="contenedor casos-cta"><div><h2>{t('ctaTitulo')}</h2><p>{t('ctaTexto')}</p></div><a className="boton boton-naranja" href={enlaceWhatsApp(t('mensaje'))} target="_blank" rel="noopener noreferrer" title={n('nuevaPestana')}>{t('cta')}<ArrowUpRight size={18}/></a></section>
 </main>;
}
