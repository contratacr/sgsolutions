import {SoloSitioPublico} from './solo-sitio-publico';
import Image from 'next/image';
import Link from 'next/link';
import {Facebook, Instagram, MapPin, Navigation} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { enlaceCorreo, enlaceWhatsApp, empresa } from '@/lib/empresa';
import {IconoWhatsApp} from './icono-whatsapp';

export async function Pie() {
  const t = await getTranslations('Pie');
  const marca = await getTranslations('Marca');
  const contacto = await getTranslations('Contacto');
  const n = await getTranslations('Navegacion');
  const whatsapp = enlaceWhatsApp(contacto('mensaje'));
  return <><footer className="pie"><div className="contenedor pie-grid"><div className="pie-identidad"><Link className="pie-firma" href="/" aria-label={n('inicio')}><Image src="/imagenes/logo-principal.png" alt={marca('logo')} width={144} height={61}/></Link><p>{t('frase')}</p><nav className="pie-explorar" aria-label={n('principal')}>{[['/tienda','tienda'],['/soporte','soporte'],['/empresas','empresas'],['/casos-de-exito','casos']].map(([href,key])=><Link key={key} href={href}>{n(key)}</Link>)}</nav></div><div className="pie-contacto"><h3>{t('contactoTitulo')}</h3><a href={`tel:${empresa.telefono}`}>{marca('telefono')}</a><a href={enlaceCorreo()} target="_blank" rel="noopener noreferrer" title={n('nuevaPestana')}>{marca('correo')}</a><div className="pie-redes" aria-label={t('redesTitulo')}><div><a href={empresa.instagram} target="_blank" rel="noopener noreferrer" title={n('nuevaPestana')} aria-label={`${t('instagram')} · ${n('nuevaPestana')}`}><Instagram size={18}/></a><SoloSitioPublico><a className="pie-whatsapp-icono" href={whatsapp} target="_blank" rel="noopener noreferrer" title={n('nuevaPestana')} aria-label={`${t('whatsapp')} · ${n('nuevaPestana')}`}><IconoWhatsApp width={19} height={19}/></a></SoloSitioPublico><a href={empresa.facebook} target="_blank" rel="noopener noreferrer" title={n('nuevaPestana')} aria-label={`${t('facebook')} · ${n('nuevaPestana')}`}><Facebook size={18}/></a></div></div></div><div className="pie-ubicacion"><h3>{t('direccionTitulo')}</h3><p className="pie-direccion">{marca('direccion')}</p><div className="pie-mapas"><a href={empresa.mapa} target="_blank" rel="noopener noreferrer" title={n('nuevaPestana')}><MapPin size={15}/>{t('googleMaps')}</a><a href={empresa.waze} target="_blank" rel="noopener noreferrer" title={n('nuevaPestana')}><Navigation size={15}/>{t('waze')}</a></div></div></div><div className="contenedor pie-base"><span>{t('derechos', {anio: 2026})}</span><nav className="pie-legales" aria-label={t('legal')}><Link href="/terminos">{t('terminos')}</Link><Link href="/privacidad">{t('privacidad')}</Link></nav></div></footer><SoloSitioPublico><a className="whatsapp-flotante" href={whatsapp} target="_blank" rel="noopener noreferrer" title={n('nuevaPestana')} aria-label={`${t('whatsapp')} · ${n('nuevaPestana')}`}><IconoWhatsApp width={29} height={29}/><span>{t('whatsapp')}</span></a></SoloSitioPublico></>;
}
