import Image from 'next/image';
import {IconoWhatsApp} from '@/components/icono-whatsapp';
import Link from 'next/link';
import {IconoGoogleMaps,IconoWaze} from './iconos-mapas';
import { ArrowLeft, Mail } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

type Props = {etiqueta: string; titulo: string; descripcion: string; imagen: string; alt: string; accion: string; href: string; oscuro?: boolean; waze?:string};
export async function CabeceraArea({etiqueta,titulo,descripcion,imagen,alt,accion,href,waze,oscuro = false}: Props) {
  const n = await getTranslations('Navegacion');
 const pie=await getTranslations('Pie');
  return <section className={`area-hero ${oscuro ? 'area-oscura' : ''}`}>
    <div className="contenedor">
      <div className="area-ruta"><Link href="/"><ArrowLeft size={14}/>{n('volver')}</Link><span aria-hidden="true">/</span><span>{etiqueta}</span></div>
      <div className="area-hero-grid"><div><p className={`etiqueta ${oscuro ? 'etiqueta-clara' : ''}`}>{etiqueta}</p><h1>{titulo}</h1><p className="area-descripcion">{descripcion}</p><div className="area-acciones" role="group" aria-label={accion}><a className="boton boton-naranja" href={href} target="_blank" rel="noopener noreferrer">{waze?<IconoGoogleMaps width={20} height={20}/>:href.includes("wa.me")?<IconoWhatsApp width={20} height={20}/>:<Mail size={18} aria-hidden="true"/>}{waze?pie('googleMaps'):accion}<span className="sr-only">{n('nuevaPestana')}</span></a>{waze&&<a className="boton boton-contorno" href={waze} target="_blank" rel="noopener noreferrer"><IconoWaze width={23} height={23}/>{pie('waze')}<span className="sr-only">{n('nuevaPestana')}</span></a>}</div></div><figure className="area-foto"><Image src={imagen} alt={alt} fill priority sizes="(max-width: 760px) 100vw, 45vw"/><figcaption>{alt}</figcaption></figure></div>
    </div>
  </section>;
}
