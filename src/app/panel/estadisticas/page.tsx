import {exigirAdminMfa} from '@/lib/acceso-panel';
import Link from 'next/link';
import {cambiarIdioma} from '@/app/acciones-idioma';
import {detalleEstadisticasCatalogo} from '@/lib/estadisticas-catalogo';
import {rutaProducto} from '@/lib/rutas-productos';
import {redirect} from 'next/navigation';
import {leerCatalogoPublico} from '@/lib/catalogo-servidor';
import {traducir} from '@/lib/catalogo-modelo';
import {getLocale,getTranslations} from 'next-intl/server';
import {sesionLocal} from '@/lib/admin-local';
import {crearClienteServidor} from '@/lib/supabase/servidor';
import {resumenAnalitica,fechasAnalitica,popularidadProductos} from '@/lib/analitica-servidor';
export async function generateMetadata(){const t=await getTranslations('Analitica');return {title:t('tituloPanel'),robots:{index:false,follow:false}};}
export default async function Estadisticas({searchParams}:{searchParams:Promise<{dias?:string}>}){
 await exigirAdminMfa();
 const local=await sesionLocal();if(!local){const db=await crearClienteServidor();if(!db)redirect('/admin');const {data:{user}}=await db.auth.getUser();if(!user)redirect('/admin');const {data}=await db.from('perfiles').select('rol,activo').eq('id',user.id).maybeSingle();if(!data?.activo||data.rol!=='administrador')redirect('/panel');}
 const dias=(await searchParams).dias==='7'?7:30;
 const t=await getTranslations('Analitica'),idioma=await getLocale();
 const [resumen,catalogo,planes,popularidad]=await Promise.all([resumenAnalitica(dias),leerCatalogoPublico(),getTranslations('Inicio'),popularidadProductos(dias)]);
 const numero=(n:number|undefined)=>n===undefined?'—':new Intl.NumberFormat(idioma==='en'?'en-US':'es-CR').format(n);
 const dinero=(n:number|undefined)=>n===undefined?'—':new Intl.NumberFormat(idioma==='en'?'en-US':'es-CR',{style:'currency',currency:'CRC',maximumFractionDigits:0}).format(n);
 const total=(tipo:string)=>resumen?.filas.filter(f=>f.tipo===tipo).reduce((s,f)=>s+f.cantidad,0);
 const contactos=['whatsapp','correo','telefono','mapa','red_social'];
 const clics=resumen?.filas.filter(f=>contactos.includes(f.tipo)).reduce((s,f)=>s+f.cantidad,0);
 const rutas:Record<string,string>={'/':'Navegacion.inicio','/tienda':'Navegacion.tienda','/soporte':'Navegacion.soporte','/empresas':'Navegacion.empresas','/casos-de-exito':'Navegacion.casos','/nosotros':'Navegacion.nosotros','/contacto':'Navegacion.contacto'};
 const nav=await getTranslations('Navegacion');
 const nombre=(tipo:string,detalle:string)=>{
  if(['producto','busqueda_producto','carrito'].includes(tipo)){const p=catalogo.productos.find(p=>p.id===detalle||p.slug===detalle);return p?traducir(p.nombre,idioma):detalle;}
  if(['plan','plan_revisado'].includes(tipo)&&['1','2','3'].includes(detalle))return planes(`plan${Number(detalle)-1}Nombre`);
  if(tipo==='pagina'&&rutas[detalle])return nav(rutas[detalle].split('.')[1]);
  return detalle||t('general');
 };
 const tarjeta=(etiqueta:string,valor:string,detalle?:string)=><article key={etiqueta}><span>{etiqueta}</span><strong>{valor}</strong>{detalle&&<small>{detalle}</small>}</article>;
 const lista=(tipo:string)=>{
  const grupos=new Map<string,number>();for(const f of resumen?.filas.filter(f=>f.tipo===tipo)??[]){const n=nombre(tipo,f.detalle);grupos.set(n,(grupos.get(n)??0)+f.cantidad);}
  const filas=[...grupos].sort((a,b)=>b[1]-a[1]).slice(0,5);
  return <section className="estadisticas-lista" key={tipo}><div className="metrica-encabezado"><h2>{t(tipo==='busqueda_producto'?'resultadosBusqueda':tipo)}</h2><span>{numero(total(tipo))}</span></div>{tipo==='busqueda_producto'&&<p>{t('resultadosBusquedaDetalle')}</p>}{filas.length?<ol>{filas.map(([n,c])=><li key={n}><span>{n}</span><strong>{numero(c)}</strong></li>)}</ol>:<p>{t('sinDatos')}</p>}</section>;
 };
 const detalle=detalleEstadisticasCatalogo(catalogo,popularidad?.vistas??resumen?.filas.filter(f=>f.tipo==='producto').map(f=>({id:f.detalle,cantidad:f.cantidad}))??[],idioma);
 const categorias=(sub=false)=>{const filas=sub?detalle.subcategorias:detalle.categorias;return <section className="estadisticas-lista"><h2>{t(sub?'subcategoriasVistas':'categoriasVistas')}</h2><p>{t('criterioCategorias')}</p>{filas.length?<ol>{filas.slice(0,10).map(f=><li key={f.id}><span>{f.nombre}{'categoria' in f&&<small>{String(f.categoria)}</small>}</span><strong>{numero(f.cantidad)}</strong></li>)}</ol>:<p>{t('sinDatos')}</p>}{detalle.sinClasificar>0&&<p>{t('fueraCatalogo',{total:numero(detalle.sinClasificar)})}</p>}</section>;};
 const ranking=(tipo:'vistas'|'compras')=>{
  const filas=[...(tipo==='vistas'?detalle.productos:popularidad?.compras??[])].sort((a,b)=>b.cantidad-a.cantidad).slice(0,10);
  return <section className="estadisticas-lista"><h2>{t(tipo==='vistas'?'masVistos':'masComprados')}</h2><p>{t(tipo==='vistas'?'masVistosDetalle':'unidadesPagadas')}</p>{filas.length?<ol>{filas.map(f=>{const p=catalogo.productos.find(p=>p.id===f.id||p.slug===f.id);const agregados=resumen?.filas.filter(x=>x.tipo==='carrito'&&(x.detalle===f.id||p&&(x.detalle===p.id||x.detalle===p.slug))).reduce((s,x)=>s+x.cantidad,0)??0;return <li key={f.id}><span>{p?<><Link href={rutaProducto(p)}>{traducir(p.nombre,idioma)}</Link><small>{p.marca}{p.codigoFabricante&&<> · {t('codigoProducto',{codigo:p.codigoFabricante})}</>}</small>{tipo==='vistas'&&<small>{t('accionesProducto',{total:numero(agregados)})}</small>}</>:<>{'nombre' in f&&typeof f.nombre==='string'?f.nombre:f.id}<small>{t('productoRetirado')}</small></>}</span><strong>{numero(f.cantidad)}</strong></li>;})}</ol>:<p>{t('sinDatos')}</p>}</section>;
 };
 const diario=resumen?.diario??[],max=Math.max(1,...diario.map(d=>d.visitas));
 const fechas=fechasAnalitica(dias);
 return <main id="contenido" className="contenedor seccion estadisticas-panel">
  <div className="estadisticas-cabecera"><h1>{t('tituloPanel')}</h1><nav aria-label={t('periodoFiltro')}>{([7,30] as const).map(n=><Link key={n} href={`/panel/estadisticas?dias=${n}`} aria-current={n===dias?'page':undefined}>{t(n===7?'periodo7':'periodo30')}</Link>)}</nav></div>
  {!resumen&&<p role="alert" className="panel-aviso">{t('noDisponible')} <a href={`/panel/estadisticas?dias=${dias}`}>{t('reintentar')}</a></p>}
  <section aria-labelledby="trafico-titulo"><h2 id="trafico-titulo" className="estadisticas-grupo" title={t('conPermiso')}>{t('trafico')}</h2><div className="estadisticas-tarjetas">
   {tarjeta(t('pagina'),numero(total('pagina')))}{tarjeta(t('producto'),numero(total('producto')))}{tarjeta(t('carrito'),numero(total('carrito')))}{tarjeta(t('clicsContacto'),numero(clics))}
  </div></section>
  <section className="estadisticas-grafico"><h2>{t('visitasDiarias')}</h2>{diario.some(d=>d.visitas)?<><div className="estadisticas-barras" role="img" aria-label={t('graficoDescripcion',{dias})}>{fechas.map(fecha=>{const valor=diario.find(d=>d.fecha===fecha)?.visitas??0;return <div key={fecha} title={`${fecha}: ${numero(valor)}`}><span style={{height:`${valor/max*100}%`}}/><span className="sr-only">{fecha}: {numero(valor)}</span></div>;})}</div><div className="estadisticas-fechas"><span>{fechas[0]}</span><span>{fechas.at(-1)}</span></div><details><summary>{t('verDatos')}</summary><table><thead><tr><th>{t('fecha')}</th><th>{t('pagina')}</th></tr></thead><tbody>{fechas.map(fecha=><tr key={fecha}><td>{fecha}</td><td>{numero(diario.find(d=>d.fecha===fecha)?.visitas??0)}</td></tr>)}</tbody></table></details></>:<p>{t('sinDatos')}</p>}</section>
  <section aria-labelledby="clientes-titulo"><h2 id="clientes-titulo" className="estadisticas-grupo">{t('clientes')}</h2><div className="estadisticas-tarjetas estadisticas-tres">
   {tarjeta(t('registrados'),numero(resumen?.clientes?.total),t('acumulado'))}{tarjeta(t('nuevosRegistros'),numero(resumen?.clientes?.nuevos))}{tarjeta(t('clientesActivos'),numero(resumen?.clientes?.activos))}
  </div></section>
  <section aria-labelledby="compras-titulo"><h2 id="compras-titulo" className="estadisticas-grupo">{t('compras')}</h2><div className="estadisticas-tarjetas">
   {tarjeta(t('pedidos'),numero(resumen?.compras?.total))}{tarjeta(t('pedidosPagados'),numero(resumen?.compras?.pagados))}{tarjeta(t('ingresos'),dinero(resumen?.compras?.ingresos))}{tarjeta(t('ticketPromedio'),dinero(resumen?.compras?.promedio))}
  </div>{resumen?.compras&&<p className="estadisticas-pendientes"><Link href="/panel/pedidos">{t('pendientesPago',{total:numero(resumen.compras.pendientes)})}</Link></p>}</section>
  <p className="estadisticas-nota">{t('exclusionAdministrativa')} {t('alcanceConteos')}</p>
  {resumen&&<div className="estadisticas-detalles">{categorias()}{categorias(true)}{popularidad?<>{ranking('vistas')}{ranking('compras')}</>:lista('producto')}{['pagina','carrito','busqueda_producto','campana','plan'].filter(tipo=>(total(tipo)??0)>0).map(lista)}{Boolean(clics)&&<section className="estadisticas-lista"><h2>{t('contactos')}</h2><ol>{contactos.map(tipo=><li key={tipo}><span>{t(tipo)}</span><strong>{numero(total(tipo))}</strong></li>)}</ol></section>}{(['dispositivos','idiomas'] as const).filter(tipo=>Boolean(resumen[tipo]?.length)).map(tipo=><section className="estadisticas-lista" key={tipo}><h2>{t(tipo)}</h2>{resumen[tipo]?.length?<ol>{resumen[tipo]!.map(f=><li key={f.detalle}><span>{t(f.detalle==='es'?'espanol':f.detalle==='en'?'ingles':f.detalle==='movil'?'movil':'escritorio')}</span><strong>{numero(f.cantidad)}</strong></li>)}</ol>:<p>{t('sinDatos')}</p>}</section>)}</div>}
  <form action={cambiarIdioma} className="estadisticas-idioma" aria-label={nav('seleccionarIdioma')}>{(['es','en'] as const).map(opcion=><button key={opcion} name="idioma" value={opcion} lang={opcion} aria-pressed={idioma===opcion} aria-label={nav(opcion==='es'?'espanol':'ingles')}>{opcion.toUpperCase()}</button>)}</form>
 </main>;
}
