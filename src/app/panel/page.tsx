import {exigirAdminMfa} from '@/lib/acceso-panel';
import Link from 'next/link';
import {Headset,Package,MessagesSquare,ChartNoAxesCombined,FileText,Truck,Users} from 'lucide-react';
import {getLocale,getTranslations} from 'next-intl/server';
import {sesionLocal} from '@/lib/admin-local';
import {leerResumenPanel} from '@/lib/resumen-panel';
import {EncabezadoPanel} from '@/components/encabezado-panel';
export async function generateMetadata(){const t=await getTranslations('Panel');return {title:t('titulo'),robots:{index:false,follow:false}};}
export default async function Panel() {
 await exigirAdminMfa();
 const local=await sesionLocal();
 const [t,analitica,soporte,idioma,resumen]=await Promise.all([getTranslations('Panel'),getTranslations('Analitica'),getTranslations('SoportePanel'),getLocale(),leerResumenPanel()]);
 const formato=new Intl.NumberFormat(idioma==='en'?'en-US':'es-CR');
 const dinero=new Intl.NumberFormat(idioma==='en'?'en-US':'es-CR',{style:'currency',currency:'CRC',maximumFractionDigits:0});
 const valor=(n:number|null,moneda=false)=>n===null?'—':moneda?dinero.format(n):formato.format(n);
 const atencion=[
  {href:'/panel/pedidos',clave:'resumenPorVerificar',n:resumen.porVerificar,tono:'aviso'},
  {href:'/panel/pedidos',clave:'resumenPorPreparar',n:resumen.porPreparar,tono:'aviso'},
  {href:'/panel/pedidos',clave:'resumenEnCamino',n:resumen.enCamino,tono:'info'},
  {href:'/panel/pedidos',clave:'resumenEsperandoPago',n:resumen.esperandoPago,tono:'neutro'},
  {href:'/panel/soporte?tipo=tickets',clave:'resumenTickets',n:resumen.ticketsAbiertos,tono:'info'},
 ] as const;
 const resultados=[
  {href:'/panel/estadisticas?dias=7',clave:'resumenVisitas',texto:valor(resumen.visitas7)},
  {href:'/panel/estadisticas',clave:'resumenPagados',texto:valor(resumen.pagados30)},
  {href:'/panel/estadisticas',clave:'resumenIngresos',texto:valor(resumen.ingresos30,true)},
 ];
 const grupos=[
  {titulo:'operaciones',items:[{href:'/panel/pedidos',titulo:t('pedidos'),detalle:t('pedidosDetalle'),Icono:MessagesSquare},{href:'/panel/soporte',titulo:soporte('titulo'),detalle:t('soporteDetalle'),Icono:Headset},{href:'/panel/usuarios',titulo:t('usuarios'),detalle:t('usuariosDetalle'),Icono:Users}]},
  {titulo:'tiendaContenido',items:[{href:'/panel/catalogo',titulo:t('productos'),detalle:t('productosDetalle'),Icono:Package},{href:'/panel/proveedores',titulo:t('proveedores'),detalle:t('proveedoresDetalle'),Icono:Truck},{href:'/panel/contenido',titulo:t('contenido'),detalle:t('contenidoDetalle'),Icono:FileText}]},
  {titulo:'resultados',items:[{href:'/panel/estadisticas',titulo:analitica('tituloPanel'),detalle:t('estadisticasDetalle'),Icono:ChartNoAxesCombined}]}
 ];
 const pendientes=atencion.reduce((s,a)=>s+(a.tono==='aviso'?a.n??0:0),0);
 return <main id="contenido" className="contenedor seccion panel-inicio">
  <EncabezadoPanel titulo={t('titulo')} descripcion={pendientes?t('resumenHayPendientes',{cantidad:pendientes}):t('resumenAlDia')}/>
  {local&&<p className="panel-aviso" role="status">{t('pruebaLocal')}</p>}
  <section className="panel-inicio-bloque" aria-labelledby="panel-atencion"><h2 id="panel-atencion">{t('resumenAtencion')}</h2><ul className="panel-resumen">{atencion.map(a=><li key={a.clave} data-tono={a.n?a.tono:undefined}><Link href={a.href}><span>{t(a.clave)}</span><strong>{valor(a.n)}</strong></Link></li>)}</ul></section>
  <section className="panel-inicio-bloque" aria-labelledby="panel-resultados"><h2 id="panel-resultados">{t('resumenResultados')}</h2><ul className="panel-resumen">{resultados.map(r=><li key={r.clave}><Link href={r.href}><span>{t(r.clave)}</span><strong>{r.texto}</strong></Link></li>)}</ul></section>
  {grupos.map(grupo=><section className="panel-grupo-modulos" key={grupo.titulo} aria-labelledby={`panel-grupo-${grupo.titulo}`}><h2 id={`panel-grupo-${grupo.titulo}`}>{t(grupo.titulo)}</h2><div className="panel-modulos">{grupo.items.map(({href,titulo,detalle,Icono})=><Link key={href} href={href}><Icono size={24} aria-hidden="true" className="panel-modulo-icono"/><div><h3>{titulo}</h3><p>{detalle}</p></div><span className="panel-modulo-flecha" aria-hidden="true">→</span></Link>)}</div></section>)}
 </main>;
}
