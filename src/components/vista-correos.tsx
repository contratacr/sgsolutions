'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useTranslations,useLocale} from 'next-intl';
import {cambiarIdioma} from '@/app/acciones-idioma';
export function VistaCorreos({ejemplos}:{ejemplos:{id:string;html:string}[]}){
 const t=useTranslations('VistaCorreos'),n=useTranslations('Navegacion'),idioma=useLocale();
 const [tipo,setTipo]=useState('pago'),[oscuro,setOscuro]=useState(false),[movil,setMovil]=useState(false),[imagenes,setImagenes]=useState(true);
 let html=ejemplos.find(e=>e.id===tipo)!.html;
 html=html.replace('@media(prefers-color-scheme:dark)',oscuro?'@media all':'@media not all');
 if(!imagenes)html=html.replace(/<img [^>]*>/g,'<span style="color:white;font-size:16px;font-weight:bold">SG Solutions</span>');
 return <main id="contenido" className="vista-correos"><header><div><p>{t('local')}</p><h1>{t('titulo')}</h1><p>{t('descripcion')}</p></div><form action={cambiarIdioma} aria-label={n('seleccionarIdioma')}>{['es','en'].map(id=><button key={id} name="idioma" value={id} aria-pressed={idioma===id}>{id.toUpperCase()}</button>)}</form></header><div className="correos-controles"><label>{t('tipo')}<select value={tipo} onChange={e=>setTipo(e.target.value)}>{ejemplos.map(e=><option key={e.id} value={e.id}>{t(e.id)}</option>)}</select></label><button aria-pressed={oscuro} onClick={()=>setOscuro(!oscuro)}>{t(oscuro?'oscuro':'claro')}</button><button aria-pressed={movil} onClick={()=>setMovil(!movil)}>{t(movil?'movil':'escritorio')}</button><button aria-pressed={!imagenes} onClick={()=>setImagenes(!imagenes)}>{t(imagenes?'conImagenes':'sinImagenes')}</button></div><p className="correos-nota">{t('nota')}</p><div className={oscuro?'correos-lienzo oscuro':'correos-lienzo'}><iframe title={t('correoEjemplo')} srcDoc={html} sandbox="" style={{width:movil?'375px':'100%',maxWidth:'100%',height:'1160px',border:0,background:oscuro?'#101d28':'white'}}/></div><Link href="/vista-previa/pedidos">{t('volver')}</Link></main>;
}
