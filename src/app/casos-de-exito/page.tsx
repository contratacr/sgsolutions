import Image from 'next/image';
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
 return <main id="contenido" className="casos-pagina">
  <header className="contenedor casos-intro"><p className="etiqueta">{t('etiqueta')}</p><h1>{t('titulo')}</h1><p>{t('descripcion')}</p></header>
  <section className="contenedor casos-lista" aria-label={t('galeria')}>
   {['red','camaras','pos'].map((imagen,i)=><article className="caso" key={imagen}>
    <div className="caso-foto"><Image src={`/imagenes/${imagen}.webp`} alt={t(`alt${i}`)} fill priority={i===0} sizes="(max-width:760px) 100vw, 55vw"/></div>
    <div className="caso-texto"><span className="caso-numero">0{i+1}</span><p className="etiqueta">{t(`categoria${i}`)}</p><h2>{t(`titulo${i}`)}</h2><div className="caso-identidad"><div className="caso-logo-ejemplo" role="img" aria-label={t('logoPendiente')}><span aria-hidden="true">{t(`cliente${i}`).split(' ').map(p=>p[0]).join('')}</span></div><div><small>{t('nombreCliente')}</small><p className="caso-cliente">{t(`cliente${i}`)}</p><small>{t('ejemplo')}</small></div></div><p>{t(`texto${i}`)}</p><dl className="caso-testimonio"><div><dt>{t('situacion')}</dt><dd>{t(`situacion${i}`)}</dd></div><div><dt>{t('solucion')}</dt><dd>{t(`respuesta${i}`)}</dd></div><div><dt>{t('valorado')}</dt><dd>{t(`valorado${i}`)}</dd></div></dl></div>
   </article>)}
  </section>
  <section className="contenedor casos-cta"><div><h2>{t('ctaTitulo')}</h2><p>{t('ctaTexto')}</p></div><a className="boton boton-naranja" href={enlaceWhatsApp(t('mensaje'))} target="_blank" rel="noopener noreferrer" title={n('nuevaPestana')}>{t('cta')}<ArrowUpRight size={18}/></a></section>
 </main>;
}
