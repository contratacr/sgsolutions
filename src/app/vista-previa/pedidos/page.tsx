import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {getLocale,getTranslations} from 'next-intl/server';
import {pedidosPropuesta} from '@/lib/pedidos-propuesta';
import {PropuestaPedidos} from '@/components/propuesta-pedidos';
import './propuesta.css';
import '../disponibilidad/disponibilidad.css';
export async function generateMetadata(){
 const t=await getTranslations('PropuestaPedidos');
 return {title:t('metaTitulo'),description:t('descripcion'),robots:{index:false,follow:false}};
}
export default async function VistaPedidos(){
 const host=(await headers()).get('host')??'';
 if(process.env.NODE_ENV!=='development'||process.env.SG_ENTORNO==='produccion'||! /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))notFound();
 const locale=await getLocale();
 const fecha=new Intl.DateTimeFormat(locale==='en'?'en-US':'es-CR',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Costa_Rica'});
 const moneda=new Intl.NumberFormat(locale==='en'?'en-US':'es-CR',{style:'currency',currency:'CRC',maximumFractionDigits:0});
 const fechas=Object.fromEntries(pedidosPropuesta.map(p=>[p.fecha,fecha.format(new Date(p.fecha))]));
 const valores=[4000,...pedidosPropuesta.flatMap(p=>[p.total,p.total-(p.entrega==='envio'?4000:0)])];
 const importes=Object.fromEntries(valores.map(v=>[v,moneda.format(v)]));
 return <PropuestaPedidos fechas={fechas} importes={importes}/>;
}
