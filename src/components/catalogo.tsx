'use client';
import Link from 'next/link';
import Image from 'next/image';
import {medir} from '@/lib/analitica-cliente';
import {EsqueletoCatalogo} from './esqueletos';
import {AsesoriaWhatsApp} from './asesoria-whatsapp';

import {FotoProducto} from './foto-producto';
import {useEffect,useRef,useState} from 'react';
import {MarcasDestacadas,logoMarca} from './marcas-destacadas';
import {ShoppingCart,Search,X,SlidersHorizontal} from 'lucide-react';
import {useLocale,useTranslations} from 'next-intl';
import {useCatalogo} from './datos-catalogo';
import {colones,traducir} from '@/lib/catalogo-modelo';
import type {PaginaCatalogo} from '@/lib/catalogo-consulta';
import {agregarProducto} from '@/lib/carrito';
import {desplazarContenido} from '@/lib/desplazar-contenido';
export function Catalogo({inicial}:{inicial:PaginaCatalogo}){
 const a=useTranslations('Asesoria');
 const e=useTranslations('Error');
 const t=useTranslations('Tienda'),s=useTranslations('Comercio'),idioma=useLocale(),datos=useCatalogo();
 const [categoria,setCategoria]=useState('todos'),[busqueda,setBusqueda]=useState(''),[orden,setOrden]=useState('menor'),[marca,setMarca]=useState(''),[subcategoria,setSubcategoria]=useState('');
 const [buscarMarca,setBuscarMarca]=useState(''),[buscarCategoria,setBuscarCategoria]=useState('');
 const [marcasElegidas,setMarcasElegidas]=useState<string[]>([]),[min,setMin]=useState(''),[max,setMax]=useState('');
 const panelFiltros=useRef<HTMLDialogElement>(null);
 const [preferenciasListas,setPreferenciasListas]=useState(false);
 const idiomaAnterior=useRef(idioma);
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>{
   try{const p=JSON.parse(sessionStorage.getItem('sg-tienda-preferencias')??'null');if(p){if(p.idioma===document.documentElement.lang){if(typeof p.categoria==='string')setCategoria(p.categoria);if(typeof p.busqueda==='string')setBusqueda(p.busqueda.slice(0,150));if(typeof p.marca==='string')setMarca(p.marca);if(typeof p.subcategoria==='string')setSubcategoria(p.subcategoria);if(Array.isArray(p.marcasElegidas))setMarcasElegidas(p.marcasElegidas.filter((x:unknown)=>typeof x==='string'));if(typeof p.min==='string')setMin(p.min);if(typeof p.max==='string')setMax(p.max);if(['menor','mayor'].includes(p.orden))setOrden(p.orden);}}}catch{}
   setPreferenciasListas(true);
  });return ()=>cancelAnimationFrame(frame);
 },[]);
 useEffect(()=>{if(preferenciasListas)try{sessionStorage.setItem('sg-tienda-preferencias',JSON.stringify({idioma,categoria,busqueda,orden,marca,subcategoria,marcasElegidas,min,max}));}catch{}},[idioma,categoria,busqueda,orden,marca,subcategoria,marcasElegidas,min,max,preferenciasListas]);
 useEffect(()=>{
  if(idiomaAnterior.current===idioma)return;
  idiomaAnterior.current=idioma;
  setCategoria('todos');setSubcategoria('');setBusqueda('');setOrden('menor');setMarca('');
 },[idioma]);
 const [paginacion,setPaginacion]=useState({clave:'',pagina:1});
 const resultados=useRef<HTMLParagraphElement>(null);
 const cuadricula=useRef<HTMLDivElement>(null);
 const desplazarResultados=useRef(false);
 const clave=JSON.stringify([categoria,busqueda,orden,marca,subcategoria,marcasElegidas,min,max,idioma]);
 const marcas=datos.marcas;

 const nombreCategoria=(id:string)=>{const c=datos.categorias.find(x=>x.id===id);return c?traducir(c.nombre,idioma):'';};
 const solicitada=paginacion.clave===clave?paginacion.pagina:1;
 const parametros=new URLSearchParams({categoria,marca,subcategoria,min,max,q:busqueda,orden,idioma,pagina:String(solicitada)});for(const m of marcasElegidas)parametros.append('marcas',m);
 const consulta=parametros.toString();
 const [respuesta,setRespuesta]=useState<{consulta:string;datos:PaginaCatalogo}>({consulta:new URLSearchParams({categoria:'todos',marca:'',subcategoria:'',min:'',max:'',q:'',orden:'menor',idioma,pagina:'1'}).toString(),datos:inicial}),[error,setError]=useState('');
 const recordar=datos.recordar;
 const [intento,setIntento]=useState(0);
 const consultaInicial=useRef(respuesta.consulta);
 useEffect(()=>{
  if(consulta===consultaInicial.current&&intento===0)return;
  consultaInicial.current='';
  const abort=new AbortController();
  const timer=setTimeout(()=>fetch(`/api/catalogo?${consulta}`,{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then((d:PaginaCatalogo)=>{setRespuesta({consulta,datos:d});if(new URLSearchParams(consulta).get('q'))d.productos.slice(0,10).forEach(p=>medir('busqueda_producto',p.id));recordar(d.productos);setError('');}).catch(()=>{if(!abort.signal.aborted)setError(consulta);}),busqueda?150:0);
  return ()=>{clearTimeout(timer);abort.abort();};
 },[consulta,recordar,intento,busqueda]);
 const cargando=respuesta?.consulta!==consulta;
 const total=respuesta?.datos.total??datos.total,paginas=respuesta?.datos.paginas??1,pagina=respuesta?.datos.pagina??1;
 const productosPagina=respuesta?.datos.productos??datos.productos.slice(0,24);
 useEffect(()=>{
  if(!cargando&&desplazarResultados.current){
   desplazarResultados.current=false;
   resultados.current?.focus({preventScroll:true});
   desplazarContenido(cuadricula.current??resultados.current,false,cuadricula.current?'contenido':'centro');
  }
 },[cargando]);
 function mostrarProductos(){resultados.current?.focus({preventScroll:true});desplazarContenido(cuadricula.current??resultados.current,false,cuadricula.current?'contenido':'centro');}
 function actualizarResultados(actualizar:()=>void){desplazarResultados.current=true;actualizar();}
 function seleccionarCategoria(id:string){
  if(categoria===id) mostrarProductos();
  else actualizarResultados(()=>setCategoria(id));
 }
 function limpiarFiltros(){setBuscarCategoria('');setBuscarMarca('');setCategoria('todos');setSubcategoria('');setMarca('');setMarcasElegidas([]);setMin('');setMax('');setBusqueda('');}
 function categoriasIntegradas(){return <div className="shop-categorias-integradas"><input type="search" className="shop-buscar-marca" aria-label={s('buscarCategoria')} placeholder={s('buscarCategoria')} value={buscarCategoria} onChange={e=>setBuscarCategoria(e.target.value)}/><div className="shop-categorias" role="group" aria-label={t('filtro')}><button aria-pressed={categoria==='todos'} onClick={()=>{setSubcategoria('');seleccionarCategoria('todos');}}>{t('todos')}<span>{datos.total}</span></button>{datos.categorias.filter(c=>c.id===categoria||traducir(c.nombre,idioma).toLocaleLowerCase().includes(buscarCategoria.toLocaleLowerCase())).map(c=><div className="shop-categoria-rama" key={c.id}><button aria-label={traducir(c.nombre,idioma)} aria-pressed={categoria===c.id} aria-expanded={categoria===c.id} onClick={()=>{setSubcategoria('');seleccionarCategoria(c.id);}}>{traducir(c.nombre,idioma)}<span>{datos.conteos[c.id]??0}</span></button>{categoria===c.id&&<div className="shop-subcategorias" role="group" aria-label={traducir(c.nombre,idioma)}><button aria-pressed={!subcategoria} onClick={()=>setSubcategoria('')}>{s('todosTipos')}</button>{datos.subcategorias.filter(x=>x.categoria===c.id).map(x=><button key={x.nombre.es} aria-pressed={subcategoria===x.nombre.es} onClick={()=>setSubcategoria(x.nombre.es)}>{traducir(x.nombre,idioma)}</button>)}</div>}</div>)}</div></div>;}
 function filtrosAdicionales(){return <div className="shop-filtros-extra"><details open className="shop-filtro-grupo"><summary>{s('marcasFiltro')}</summary><input className="shop-buscar-marca" type="search" aria-label={s('buscarMarca')} placeholder={s('buscarMarca')} value={buscarMarca} onChange={e=>setBuscarMarca(e.target.value)}/><div className="shop-marcas-opciones">{marcas.filter(m=>m.toLocaleLowerCase().includes(buscarMarca.toLocaleLowerCase())).filter(m=>categoria==='todos'||(datos.conteosMarcas[m]?.categorias[categoria]??0)>0).slice().sort().map(m=><label key={m}><input type="checkbox" checked={marcasElegidas.includes(m)||marca===m} onChange={e=>{const actuales=[...new Set([...marcasElegidas,...(marca?[marca]:[])])];setMarca('');setMarcasElegidas(e.target.checked?[...new Set([...actuales,m])]:actuales.filter(x=>x!==m));}}/><span>{logoMarca(m)&&<Image className="shop-logo-marca" src={`/imagenes/marcas/${logoMarca(m)!.archivo}`} alt="" width={36} height={20} unoptimized/>}<span className="shop-nombre-marca">{m}</span> <small>({categoria==='todos'?datos.conteosMarcas[m]?.total:datos.conteosMarcas[m]?.categorias[categoria]??0})</small></span></label>)}</div></details><div className="shop-rango-precios"><label>{s('precioMin')}<input type="number" min="0" max="1000000000" value={min} onChange={e=>setMin(e.target.value)}/></label><label>{s('precioMax')}<input type="number" min="0" max="1000000000" value={max} onChange={e=>setMax(e.target.value)}/></label></div></div>;}
 function cambiarPagina(nueva:number){actualizarResultados(()=>setPaginacion({clave,pagina:nueva}));}
 return <>
  <section className="asesoria-hero"><div className="asesoria-hero-texto"><p className="etiqueta">{a('etiqueta')}</p><h1>{traducir(datos.textos.titulo,idioma)}</h1><p>{traducir(datos.textos.descripcion,idioma)}</p></div><div className="asesoria-hero-acciones"><AsesoriaWhatsApp etiqueta="asesorar"/></div></section>
  <MarcasDestacadas marcas={marcas} seleccionada={marca} seleccionar={nombre=>actualizarResultados(()=>{setMarca(marca===nombre?'':nombre);setCategoria('todos');setSubcategoria('');setBusqueda('');})}/>
  <div className="shop-buscador"><Search size={23}/><label className="sr-only" htmlFor="buscar-equipo">{t('buscar')}</label><input id="buscar-equipo" type="search" disabled={!preferenciasListas} value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder={t('buscar')} maxLength={150}/>{busqueda&&<button aria-label={t('limpiarBusqueda')} onClick={()=>setBusqueda('')}><X size={20}/></button>}</div>
  <button className="boton boton-contorno shop-abrir-filtros" onClick={()=>panelFiltros.current?.showModal()}><SlidersHorizontal size={18}/>{s('filtros')}</button><dialog ref={panelFiltros} className="shop-panel-filtros" aria-label={s('filtros')} onClick={e=>{if(e.target===e.currentTarget)panelFiltros.current?.close();}}><button aria-label={s('cerrarFiltros')} onClick={()=>panelFiltros.current?.close()}><X/></button><h2>{s('filtros')}</h2>{categoriasIntegradas()}{filtrosAdicionales()}<button onClick={limpiarFiltros}>{s('limpiarFiltros')}</button><button className="boton boton-azul" onClick={()=>panelFiltros.current?.close()}>{s('verResultados')} ({total})</button></dialog><div className="shop-filtros-activos">{[...(categoria!=='todos'?[{texto:nombreCategoria(categoria),quitar:()=>{setCategoria('todos');setSubcategoria('');}}]:[]),...(subcategoria?[{texto:traducir(datos.subcategorias.find(x=>x.nombre.es===subcategoria)?.nombre??{es:subcategoria,en:subcategoria},idioma),quitar:()=>setSubcategoria('')}]:[]),...[...new Set([...marcasElegidas,...(marca?[marca]:[])])].map(m=>({texto:m,quitar:()=>{if(marca===m)setMarca('');setMarcasElegidas(prev=>prev.filter(x=>x!==m));}})),...(min?[{texto:s('precioMin')+': '+min,quitar:()=>setMin('')}]:[]),...(max?[{texto:s('precioMax')+': '+max,quitar:()=>setMax('')}]:[])].map(x=><button key={x.texto} onClick={x.quitar}>{x.texto}<X size={14}/></button>)}{(categoria!=='todos'||subcategoria||marca||marcasElegidas.length>0||min||max||busqueda)&&<button onClick={limpiarFiltros}>{s('limpiarFiltros')}</button>}</div><div className="shop-distribucion" id="catalogo"><aside className="shop-sidebar"><h2><SlidersHorizontal size={16}/>{s('categorias')}</h2>{categoriasIntegradas()}{filtrosAdicionales()}</aside>
  <section className="shop-resultados" aria-busy={cargando&&error!==consulta}><div className="shop-resultados-cabecera"><div><p ref={resultados} tabIndex={-1} className="conteo" aria-live="polite">{total===1?t('resultados',{cantidad:total}):s('productosEncontrados',{cantidad:new Intl.NumberFormat(idioma==='es'?'de-DE':'en-US').format(total)})}</p></div><label className="shop-orden">{s('ordenar')}<select disabled={!preferenciasListas} value={orden} onChange={e=>setOrden(e.target.value)}><option value="menor">{s('menor')}</option><option value="mayor">{s('mayor')}</option></select></label></div>
  {error===consulta?<div className="estado-inline" role="alert"><p>{t('errorCarga')}</p><button className="boton boton-azul" onClick={()=>{setError('');setIntento(i=>i+1);}}>{e('reintentar')}</button></div>:cargando&&!productosPagina.length?<EsqueletoCatalogo texto={t('cargando')}/>:!total?<div className="catalogo-vacio"><Search size={30}/><h3>{t('sinResultados')}</h3><p>{t('intentarBusqueda')}</p><button className="boton boton-contorno" onClick={limpiarFiltros}>{t('restablecer')}</button></div>:<div className="shop-grid" ref={cuadricula}>{productosPagina.map(p=>{return <article className="shop-producto" key={p.id}><div className="shop-foto">{/* Las URLs de proveedor se muestran directamente: no se importan credenciales ni se descargan imágenes de terceros. */}
  <Link href={`/tienda/${p.id}`}><FotoProducto src={p.imagen} alt={traducir(p.nombre,idioma)}/></Link><button className="boton boton-azul guardar-seleccion" disabled={cargando||p.disponibilidad==='agotado'} onClick={()=>{datos.recordar([p]);agregarProducto(p.id,1);}}><ShoppingCart size={20} aria-hidden="true"/><span className="shop-agregar-texto">{p.disponibilidad==='agotado'?t('agotado'):t('agregar')}</span></button></div><div className="shop-producto-info"><span className="shop-marca">{p.marca||nombreCategoria(p.categoria)}</span><h3><Link href={`/tienda/${p.id}`}>{traducir(p.nombre,idioma).split(' - ').slice(0,3).join(' · ')}</Link></h3><small className="shop-codigo">{p.codigoFabricante&&<>{s('codigoFabricante')} {p.codigoFabricante}</>}</small>{p.disponibilidad==='agotado'&&<small>{t('agotado')}</small>}<div className="shop-precio"><strong>{p.precio===null?t('precioPendiente'):colones(p.precio)}</strong><small>{p.precio===null?s('consultar'):a('precioConIva')}</small></div></div></article>;})}</div>}
  {!cargando&&paginas>1&&<nav className="shop-paginacion" aria-label={t('paginacion')}><button type="button" disabled={pagina===1} onClick={()=>cambiarPagina(pagina-1)}>{t('anterior')}</button><span role="status">{t('pagina',{pagina,total:paginas})}</span><button type="button" disabled={pagina===paginas} onClick={()=>cambiarPagina(pagina+1)}>{t('siguiente')}</button></nav>}
  </section></div>
 </>;
}
