import {exigirAdminMfa} from '@/lib/acceso-panel';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getLocale,getTranslations} from 'next-intl/server';
import {leerEurocomp,eurocompConfigurado,actualizacionEurocompHabilitada} from '@/lib/eurocomp-servidor';
import {ErrorEurocomp} from '@/lib/eurocomp-protocolo';
import {actualizarProveedor} from './acciones';
import {ActualizarEurocomp} from '@/components/actualizar-eurocomp';
import {EncabezadoPanel} from '@/components/encabezado-panel';
import {sesionLocal,leerLocal} from '@/lib/admin-local';
import {crearClienteServidor} from '@/lib/supabase/servidor';
import {esquemaCatalogo} from '@/lib/catalogo-modelo';
import {migrarCatalogoManual} from '@/lib/catalogo-manual';
import {esProductoEurocomp} from '@/lib/catalogo-fuente';
import {motivosOcultoPublico,type MotivoOculto} from '@/lib/visibilidad-admin';
import '../catalogo/catalogo-panel.css';
export async function generateMetadata(){const t=await getTranslations('Proveedores');return {title:t('titulo'),robots:{index:false,follow:false}};}
const errores=new Set(['configuracion','espera','conexion','respuesta','tiempo','almacenamiento','conflicto','sinPermiso','codigo1','codigo2','codigo3','codigo4','codigo5','codigo6','codigo20','codigo26','codigo27','codigo28']);
type EnTienda={id:string;nombre:{es:string;en:string};motivos:MotivoOculto[]};
/** Read-only: which supplier codes already exist in the private store catalog (admin + MFA already verified). */
async function productosEnTienda():Promise<Map<string,EnTienda>|null>{
 try{
  let contenido:unknown;
  if(await sesionLocal())contenido=(await leerLocal('catalogo'))?.contenido;
  else{const cliente=await crearClienteServidor();if(!cliente)return null;const {data,error}=await cliente.from('catalogo_privado').select('contenido').eq('id',1).maybeSingle();if(error)return null;contenido=data?.contenido;}
  if(!contenido)return new Map();
  const c=migrarCatalogoManual(esquemaCatalogo.parse(contenido));
  return new Map(c.productos.filter(esProductoEurocomp).map(p=>[p.eurocomp?.codigo??p.codigoEurocomp!,{id:p.id,nombre:p.nombre,motivos:motivosOcultoPublico(p,c.ajustes)}]));
 }catch{return null;}
}
export default async function Proveedores({searchParams}:{searchParams:Promise<{q?:string;pagina?:string;resultado?:string}>}){
 await exigirAdminMfa();
 const t=await getTranslations('Proveedores'),tc=await getTranslations('AdminCatalogo'),tp=await getTranslations('Panel');const idioma=await getLocale();const params=await searchParams;
 const q=typeof params.q==='string'?params.q.trim().slice(0,150):'';
 const solicitada=Number(params.pagina);const numeroPagina=Number.isSafeInteger(solicitada)&&solicitada>0?Math.min(2500,solicitada):1;
 let catalogo=null,error='';
 try{catalogo=await leerEurocomp(q,numeroPagina);}catch(e){if(e instanceof ErrorEurocomp&&e.codigo==='sinPermiso')redirect('/admin');error='almacenamiento';}
 const tienda=catalogo?await productosEnTienda():null;
 const pagina=catalogo?.pagina??1,paginas=catalogo?.paginas??1;
 const resultado=params.resultado==='actualizado'?'actualizado':errores.has(params.resultado??'')?params.resultado:error;
 const precio=(valor:number|null,moneda:string)=>valor===null||!['CRC','USD'].includes(moneda)?t('sinDato'):new Intl.NumberFormat(idioma==='en'?'en-US':'es-CR',{style:'currency',currency:moneda,maximumFractionDigits:2}).format(valor);
 return <main id="contenido" className="contenedor seccion eurocomp-panel">
  <EncabezadoPanel seccion={tp('tiendaContenido')} titulo={t('titulo')} descripcion={t('descripcion')} acciones={<form action={actualizarProveedor}><ActualizarEurocomp configurado={actualizacionEurocompHabilitada()}/></form>}/>
  <p className="panel-aviso">{t('aviso')}</p>
  {!eurocompConfigurado()&&<p role="status" className="panel-aviso">{t('configuracion')}</p>}
  {eurocompConfigurado()&&!actualizacionEurocompHabilitada()&&<p role="status" className="panel-aviso">{t('manualDeshabilitada')}</p>}
  {catalogo&&!tienda&&<p role="status" className="panel-aviso">{t('tiendaNoDisponible')}</p>}
  {resultado&&<p role={resultado==='actualizado'?'status':'alert'} className="panel-aviso">{t(resultado as 'actualizado')}</p>}
  {catalogo&&<p>{t('resumen',{total:catalogo.total,fecha:new Intl.DateTimeFormat(idioma==='en'?'en-US':'es-CR',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Costa_Rica'}).format(new Date(catalogo.fecha))})}</p>}
  <form method="get" className="eurocomp-busqueda"><label htmlFor="buscar-proveedor">{t('buscar')}</label><div><input id="buscar-proveedor" name="q" maxLength={150} defaultValue={q}/><button className="boton boton-contorno">{t('buscarBoton')}</button></div></form>
  {!catalogo?<p>{t('vacio')}</p>:<><p>{t('resultados',{total:catalogo.resultados})}</p><div className="eurocomp-productos">
   {catalogo.articulos.map(a=><article key={a.codigo}><div><h2>{a.nombre}</h2><p>{[a.marca,a.familia].filter(Boolean).join(' · ')}</p><p><strong>{t('codigo')}:</strong> {a.codigo}{a.parte&&<> · {t('parte')}: {a.parte}</>}</p>{tienda&&(()=>{const p=tienda.get(a.codigo);if(!p)return <div className="proveedor-tienda"><span className="panel-chip" data-tono="neutro">{t('noEnTienda')}</span></div>;const nombre=idioma==='en'?p.nombre.en:p.nombre.es;return <div className="proveedor-tienda"><span className="panel-chip" data-tono="info">{t('enTienda')}</span>{p.motivos.length?<span className="panel-chip" data-tono="aviso">{tc('ocultoPublico')}</span>:<span className="panel-chip" data-tono="exito">{tc('visibleTienda')}</span>}{p.motivos.length>0&&<small>{tc('motivo',{motivos:p.motivos.map(m=>tc(`motivos.${m}`)).join(' · ')})}</small>}<Link href={`/panel/catalogo?producto=${encodeURIComponent(p.id)}`} aria-label={t('editarProductoEtiqueta',{nombre})}>{t('editarProducto')}</Link></div>;})()}</div><dl><div><dt>{t('precio')}</dt><dd>{precio(a.precio,a.moneda)}{a.precio!==null&&['CRC','USD'].includes(a.moneda)&&<small className="proveedor-sin-iva"> {t('sinIva')}</small>}</dd></div><div><dt>{t('existencias')}</dt><dd>{a.stock===null?t('sinDato'):a.stock}</dd></div></dl></article>)}
  </div>{!catalogo.articulos.length&&<p>{t('sinResultados')}</p>}
  <nav className="eurocomp-paginacion" aria-label={t('paginacion')}>
   {pagina>1&&<Link className="boton boton-contorno" href={`/panel/proveedores?q=${encodeURIComponent(q)}&pagina=${pagina-1}`}>{t('anterior')}</Link>}
   <span>{t('pagina',{pagina,total:paginas})}</span>
   {pagina<paginas&&<Link className="boton boton-contorno" href={`/panel/proveedores?q=${encodeURIComponent(q)}&pagina=${pagina+1}`}>{t('siguiente')}</Link>}
  </nav></>}
 </main>;
}
