import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

type Props = {etiqueta: string; titulo: string; descripcion: string; imagen: string; alt: string; accion: string; href: string; oscuro?: boolean};
export async function CabeceraArea({etiqueta,titulo,descripcion,imagen,alt,accion,href,oscuro = false}: Props) {
  const n = await getTranslations('Navegacion');
  return <section className={`area-hero ${oscuro ? 'area-oscura' : ''}`}>
    <div className="contenedor">
      <div className="area-ruta"><Link href="/"><ArrowLeft size={14}/>{n('volver')}</Link><span aria-hidden="true">/</span><span>{etiqueta}</span></div>
      <div className="area-hero-grid"><div><p className={`etiqueta ${oscuro ? 'etiqueta-clara' : ''}`}>{etiqueta}</p><h1>{titulo}</h1><p className="area-descripcion">{descripcion}</p><a className="boton boton-naranja" href={href} target="_blank" rel="noopener noreferrer">{accion}<ArrowUpRight size={18}/></a></div><figure className="area-foto"><Image src={imagen} alt={alt} fill priority sizes="(max-width: 760px) 100vw, 45vw"/><figcaption>{alt}</figcaption></figure></div>
    </div>
  </section>;
}
