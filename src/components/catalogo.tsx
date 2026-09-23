'use client';
import Link from 'next/link';
import {medir} from '@/lib/analitica-cliente';
import {enlaceWhatsApp} from '@/lib/empresa';
import {FotoProducto} from './foto-producto';
import {useEffect,useRef,useState} from 'react';
import {MarcasDestacadas} from './marcas-destacadas';
import {Plus,Check,Search,X,SlidersHorizontal} from 'lucide-react';
import {useLocale,useTranslations} from 'next-intl';
import {useCatalogo} from './datos-catalogo';
import {colones,traducir} from '@/lib/catalogo-modelo';
import type {PaginaCatalogo} from '@/lib/catalogo-consulta';
import {agregarProducto,useCarrito} from '@/lib/carrito';
import {desplazarContenido} from '@/lib/desplazar-contenido';
export function Catalogo(){
 const n=useTranslations('Navegacion');
 const e=useTranslations('Error');
 const t=useTranslations('Tienda'),s=useTranslations('Comercio'),idioma=useLocale(),datos=useCatalogo();
 const [categoria,setCategoria]=useState('todos'),[busqueda,setBusqueda]=useState(''),[orden,setOrden]=useState('destacados'),[marca,setMarca]=useState('');
 const [vista,setVista]=useState('cuadricula'),[preferenciasListas,setPreferenciasListas]=useState(false);
 const idiomaAnterior=useRef(idioma);
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>{
   try{const p=JSON.parse(sessionStorage.getItem('sg-tienda-preferencias')??'null');if(p){if(typeof p.categoria==='string')setCategoria(p.categoria);if(typeof p.busqueda==='string')setBusqueda(p.busqueda.slice(0,150));if(typeof p.marca==='string')setMarca(p.marca);if(['destacados','menor','mayor','nombre'].includes(p.orden))setOrden(p.orden);if(p.vista==='lista')setVista('lista');}}catch{}
   setPreferenciasListas(true);
  });return ()=>cancelAnimationFrame(frame);
 },[idioma]);
 useEffect(()=>{if(preferenciasListas)try{sessionStorage.setItem('sg-tienda-preferencias',JSON.stringify({idioma,categoria,busqueda,orden,marca,vista}));}catch{}},[idioma,categoria,busqueda,orden,marca,vista,preferenciasListas]);
 useEffect(()=>{
  if(idiomaAnterior.current===idioma)return;
  idiomaAnterior.current=idioma;
  setCategoria('todos');setBusqueda('');setOrden('destacados');setMarca('');
 },[idioma]);
 const [paginacion,setPaginacion]=useState({clave:'',pagina:1});
 const resultados=useRef<HTMLHeadingElement>(null);
 const desplazarResultados=useRef(false);
 const clave=JSON.stringify([categoria,busqueda,orden,marca,idioma]);
 const marcas=datos.marcas;
 const lineas=useCarrito();
 const nombreCategoria=(id:string)=>{const c=datos.categorias.find(x=>x.id===id);return c?traducir(c.nombre,idioma):'';};
 const solicitada=paginacion.clave===clave?paginacion.pagina:1;
 const consulta=new URLSearchParams({categoria,marca,q:busqueda,orden,idioma,pagina:String(solicitada)}).toString();
 const [respuesta,setRespuesta]=useState<{consulta:string;datos:PaginaCatalogo}|null>(null),[error,setError]=useState('');
 const recordar=datos.recordar;
 const [intento,setIntento]=useState(0);
 useEffect(()=>{
  const abort=new AbortController();
  const timer=setTimeout(()=>fetch(`/api/catalogo?${consulta}`,{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then((d:PaginaCatalogo)=>{setRespuesta({consulta,datos:d});if(new URLSearchParams(consulta).get('q'))d.productos.slice(0,10).forEach(p=>medir('busqueda_producto',p.id));recordar(d.productos);setError('');}).catch(()=>{if(!abort.signal.aborted)setError(consulta);}),150);
  return ()=>{clearTimeout(timer);abort.abort();};
 },[consulta,recordar,intento]);
 const cargando=respuesta?.consulta!==consulta;
 const total=respuesta?.datos.total??datos.total,paginas=respuesta?.datos.paginas??1,pagina=respuesta?.datos.pagina??1;
 const productosPagina=respuesta?.datos.productos??datos.productos.slice(0,24);
 useEffect(()=>{
  if(!cargando&&desplazarResultados.current){
   desplazarResultados.current=false;
   desplazarContenido(resultados.current,true);
  }
 },[cargando]);
 function actualizarResultados(actualizar:()=>void){desplazarResultados.current=true;actualizar();}
 function seleccionarCategoria(id:string){
  if(categoria===id) desplazarContenido(resultados.current,true);
  else actualizarResultados(()=>setCategoria(id));
 }
 function cambiarPagina(nueva:number){actualizarResultados(()=>setPaginacion({clave,pagina:nueva}));}
 return <>
  <section className="shop-intro"><div><p className="etiqueta">{s('marca')} / {t('etiqueta')}</p><h1>{traducir(datos.textos.titulo,idioma)}</h1><p>{traducir(datos.textos.descripcion,idioma)}</p></div><a href={enlaceWhatsApp(s('asesoriaMensaje'))} className="shop-ayuda" target="_blank" rel="noopener noreferrer" title={n('nuevaPestana')}><span>{s('asesoria')}<small>{s('asesoriaTexto')}</small></span><span className="sr-only">{n('nuevaPestana')}</span></a></section>
  <MarcasDestacadas marcas={marcas} seleccionada={marca} seleccionar={nombre=>actualizarResultados(()=>{setMarca(marca===nombre?'':nombre);setCategoria('todos');setBusqueda('');})}/>
  <div className="shop-buscador"><Search size={23}/><label className="sr-only" htmlFor="buscar-equipo">{t('buscar')}</label><input id="buscar-equipo" type="search" value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder={t('buscar')} maxLength={150}/>{busqueda&&<button aria-label={t('limpiarBusqueda')} onClick={()=>setBusqueda('')}><X size={20}/></button>}<span>{s('moneda')}</span></div>
  <div className="shop-distribucion" id="catalogo"><aside className="shop-sidebar"><h2><SlidersHorizontal size={16}/>{s('categorias')}</h2><div className="shop-categorias" role="group" aria-label={t('filtro')}><button aria-pressed={categoria==='todos'} onClick={()=>seleccionarCategoria('todos')}>{t('todos')}<span>{datos.total}</span></button>{datos.categorias.map(c=><button key={c.id} aria-label={traducir(c.nombre,idioma)} aria-pressed={categoria===c.id} onClick={()=>seleccionarCategoria(c.id)}>{traducir(c.nombre,idioma)}<span>{datos.conteos[c.id]??0}</span></button>)}</div></aside>
  <section className="shop-resultados" aria-busy={cargando}><div className="shop-resultados-cabecera"><div><h2 ref={resultados} tabIndex={-1}>{categoria==='todos'?s('seleccion'):nombreCategoria(categoria)}</h2><p className="conteo" aria-live="polite">{t('resultados',{cantidad:total})}</p></div><label className="shop-orden">{s('ordenar')}<select value={orden} onChange={e=>setOrden(e.target.value)}><option value="destacados">{s('destacados')}</option><option value="menor">{s('menor')}</option><option value="mayor">{s('mayor')}</option><option value="nombre">{s('nombre')}</option></select></label></div>
  <div className="shop-vistas" role="group" aria-label={t('vistaCatalogo')}>{['cuadricula','lista'].map(v=><button key={v} type="button" aria-pressed={vista===v} onClick={()=>setVista(v)}>{t(v==='lista'?'vistaLista':'vistaCuadricula')}</button>)}</div>
  {error===consulta?<div className="estado-inline" role="alert"><p>{t('errorCarga')}</p><button className="boton boton-azul" onClick={()=>{setError('');setIntento(i=>i+1);}}>{e('reintentar')}</button></div>:cargando?<div className="estado-inline" role="status"><span className="estado-carga" aria-hidden="true"/>{t('cargando')}</div>:!total?<div className="catalogo-vacio"><Search size={30}/><h3>{t('sinResultados')}</h3><p>{t('intentarBusqueda')}</p><button className="boton boton-contorno" onClick={()=>{setCategoria('todos');setBusqueda('');setMarca('');}}>{t('restablecer')}</button></div>:<div className="shop-grid" data-vista={vista}>{productosPagina.map(p=>{const agregado=lineas.some(l=>l.id===p.id);return <article className="shop-producto" key={p.id}><div className="shop-foto">{/* Las URLs de proveedor se muestran directamente: no se importan credenciales ni se descargan imágenes de terceros. */}
  <Link href={`/tienda/${p.id}`}><FotoProducto src={p.imagen} alt={traducir(p.nombre,idioma)}/></Link>{p.destacado&&<span>{s('destacado')}</span>}</div><div className="shop-producto-info"><span className="shop-marca">{p.marca||nombreCategoria(p.categoria)}</span><h3><Link href={`/tienda/${p.id}`}>{traducir(p.nombre,idioma).split(' - ').slice(0,3).join(' · ')}</Link></h3><p className="shop-descripcion">{traducir(p.descripcion,idioma)!==traducir(p.nombre,idioma).split(' - ').slice(0,3).join(' - ')?traducir(p.descripcion,idioma):''}</p><small className="shop-codigo">{p.codigoFabricante&&<>{s('codigoFabricante')} {p.codigoFabricante}</>}</small><small>{t(p.disponibilidad==='proveedor'?'proveedor':p.disponibilidad==='agotado'?'agotado':'consultarDisponibilidad')}</small><div className="shop-precio"><strong>{p.precio===null?t('precioPendiente'):colones(p.precio)}</strong><small>{p.precio===null?s('consultar'):s('iva')}</small></div><button className="boton boton-contorno" disabled={p.disponibilidad==='agotado'} onClick={()=>{datos.recordar([p]);agregarProducto(p.id);}}>{p.disponibilidad==='agotado'?t('agotado'):agregado?t('agregado'):t('agregar')}{agregado?<Check size={18}/>:<Plus size={18}/>}</button></div></article>;})}</div>}
  {!cargando&&paginas>1&&<nav className="shop-paginacion" aria-label={t('paginacion')}><button type="button" disabled={pagina===1} onClick={()=>cambiarPagina(pagina-1)}>{t('anterior')}</button><span role="status">{t('pagina',{pagina,total:paginas})}</span><button type="button" disabled={pagina===paginas} onClick={()=>cambiarPagina(pagina+1)}>{t('siguiente')}</button></nav>}
  <p className="shop-aviso">{traducir(datos.textos.aviso,idioma)}</p></section></div>
 </>;
}
