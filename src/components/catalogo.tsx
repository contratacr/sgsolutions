'use client';
import {BuscadorCatalogo,type SugerenciaCatalogo} from './buscador-catalogo';
import {consultarJsonCatalogo} from '@/lib/consulta-catalogo';
import {IndicadorCantidad} from './indicador-cantidad';
import {TarjetaProducto} from './tarjeta-producto';

import {leerHistorial,recordarExploracion} from '@/lib/historial-tienda';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {nombreMarca} from '@/lib/marcas-nombres';
import {medir} from '@/lib/analitica-cliente';
import {EsqueletoCatalogo} from './esqueletos';
import {AsesoriaWhatsApp} from './asesoria-whatsapp';

import {useEffect,useRef,useState} from 'react';
import {MarcasDestacadas} from './marcas-destacadas';
import {Heart,Search,X,SlidersHorizontal,RotateCcw,ChevronDown} from 'lucide-react';
import {useLocale,useTranslations} from 'next-intl';
import {useCatalogo} from './datos-catalogo';
import {traducir} from '@/lib/catalogo-modelo';
import type {PaginaCatalogo} from '@/lib/catalogo-consulta';
import {useFavoritos} from '@/lib/favoritos';
import {useSesionCuenta} from './sesion-cuenta';
import {OrdenCatalogo} from './orden-catalogo';
import {FiltroPrecio} from './filtro-precio';
import {ListaFiltros} from './lista-filtros';
import {desplazarContenido} from '@/lib/desplazar-contenido';
export function Catalogo({inicial,categoriaInicial='todos'}:{inicial:PaginaCatalogo;categoriaInicial?:string}){
 const router=useRouter();
 const se=useTranslations('SolucionesEmpresariales');
 const almacenamiento='sg-tienda-preferencias';
 const sidebar=useRef<HTMLElement>(null);
 useEffect(()=>{
  const restablecer=()=>{const panel=sidebar.current;
   if(panel&&window.matchMedia('(min-width:651px)').matches){
    const limite=parseFloat(getComputedStyle(panel).top)||0;
    const arriba=panel.getBoundingClientRect().top;
    panel.style.setProperty('--sidebar-altura-visible',`${Math.max(160,window.innerHeight-Math.max(limite,arriba)-16)}px`);
    if(arriba>limite+1)panel.scrollTop=0;
   }
  };
  window.addEventListener('scroll',restablecer,{passive:true});
  window.addEventListener('resize',restablecer);
  restablecer();
  return()=>{window.removeEventListener('scroll',restablecer);window.removeEventListener('resize',restablecer);};
 },[]);
 const favoritos=useFavoritos(),sesionIniciada=useSesionCuenta();
 const f=useTranslations('AccionesProducto');
 const n=useTranslations('Navegacion');
 const [historial,setHistorial]=useState({activo:false,ids:[] as string[],vistas:[] as string[]});
 useEffect(()=>{const leer=()=>setHistorial(leerHistorial());leer();window.addEventListener('sg-historial',leer);window.addEventListener('storage',leer);return()=>{window.removeEventListener('sg-historial',leer);window.removeEventListener('storage',leer);};},[]);
 const e=useTranslations('Error');
 const t=useTranslations('Tienda'),s=useTranslations('Comercio'),idioma=useLocale(),compartidos=useCatalogo();
 const datos=compartidos;
 const [categoria,setCategoria]=useState(categoriaInicial),[busqueda,setBusqueda]=useState(''),[orden,setOrden]=useState('recomendados'),[marca,setMarca]=useState(''),[subcategoria,setSubcategoria]=useState('');
 const [categoriaExpandida,setCategoriaExpandida]=useState(categoriaInicial==='todos'?'':categoriaInicial);
 const [buscarMarca,setBuscarMarca]=useState(''),[buscarCategoria,setBuscarCategoria]=useState('');
 const [marcasElegidas,setMarcasElegidas]=useState<string[]>([]),[min,setMin]=useState(''),[max,setMax]=useState('');
 const panelFiltros=useRef<HTMLDialogElement>(null);
 const [filtrosPendientes,setFiltrosPendientes]=useState<null|{categoria:string;marca:string;subcategoria:string;marcasElegidas:string[];min:string;max:string;busqueda:string}>(null);
 // While the modal edits local controls, every background surface uses this snapshot.
 const aplicados=filtrosPendientes??{categoria,marca,subcategoria,marcasElegidas,min,max,busqueda};
 const filtrosAbiertos=filtrosPendientes!==null;
 useEffect(()=>{
  if(!filtrosAbiertos)return;
  const panel=panelFiltros.current,raiz=document.documentElement,cuerpo=document.body;
  const x=window.scrollX,y=window.scrollY;
  const anterior={position:cuerpo.style.position,top:cuerpo.style.top,left:cuerpo.style.left,width:cuerpo.style.width,overflow:cuerpo.style.overflow,raiz:raiz.style.overflow};
  Object.assign(cuerpo.style,{position:'fixed',top:`-${y}px`,left:`-${x}px`,width:'100%',overflow:'hidden'});
  raiz.style.overflow='hidden';
  const contenido=panel?.querySelector('.modal-nativo-cuerpo');
  const proteger=(evento:Event)=>{if(!(evento.target instanceof Node)||!contenido?.contains(evento.target))evento.preventDefault();};
  document.addEventListener('touchmove',proteger,{passive:false});
  document.addEventListener('contextmenu',proteger);
  return()=>{
   document.removeEventListener('touchmove',proteger);document.removeEventListener('contextmenu',proteger);
   Object.assign(cuerpo.style,{position:anterior.position,top:anterior.top,left:anterior.left,width:anterior.width,overflow:anterior.overflow});
   raiz.style.overflow=anterior.raiz;window.scrollTo({left:x,top:y,behavior:'instant'});
  };
 },[filtrosAbiertos]);

 const [preferenciasListas,setPreferenciasListas]=useState(false);
 const idiomaAnterior=useRef(idioma);
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>{
   try{const p=JSON.parse(sessionStorage.getItem(almacenamiento)??'null');if(p){if(p.idioma===document.documentElement.lang){if(categoriaInicial==='todos'&&typeof p.categoria==='string'){setCategoria(p.categoria);setCategoriaExpandida(p.categoria==='todos'?'':p.categoria);}if(typeof p.busqueda==='string')setBusqueda(p.busqueda.slice(0,150));if(typeof p.marca==='string')setMarca(nombreMarca(p.marca));if(categoriaInicial==='todos'&&typeof p.subcategoria==='string')setSubcategoria(p.subcategoria);if(Array.isArray(p.marcasElegidas))setMarcasElegidas(p.marcasElegidas.filter((x:unknown)=>typeof x==='string').map(nombreMarca));if(typeof p.min==='string')setMin(p.min);if(typeof p.max==='string')setMax(p.max);if(['recomendados','menor','mayor'].includes(p.orden))setOrden(p.orden);}}}catch{}
   setPreferenciasListas(true);
  });return ()=>cancelAnimationFrame(frame);
 },[almacenamiento,categoriaInicial]);
 useEffect(()=>{if(preferenciasListas&&!filtrosPendientes)try{sessionStorage.setItem(almacenamiento,JSON.stringify({idioma,categoria,busqueda,orden,marca,subcategoria,marcasElegidas,min,max}));}catch{}},[idioma,categoria,busqueda,orden,marca,subcategoria,marcasElegidas,min,max,preferenciasListas,filtrosPendientes,almacenamiento]);
 useEffect(()=>{
  if(idiomaAnterior.current===idioma)return;
  idiomaAnterior.current=idioma;
  setCategoria('todos');setSubcategoria('');setBusqueda('');setOrden('recomendados');setMarca('');
 },[idioma]);
 const [paginacion,setPaginacion]=useState({clave:'',pagina:1});
 const resultados=useRef<HTMLParagraphElement>(null);
 const cuadricula=useRef<HTMLDivElement>(null);
 const desplazarResultados=useRef(false);
 const marcas=datos.marcas.filter(nombre=>(datos.conteosMarcas[nombre]?.total??0)>0);

 const nombreCategoria=(id:string)=>{const c=datos.categorias.find(x=>x.id===id);return c?traducir(c.nombre,idioma):'';};
 const parametros=new URLSearchParams({categoria:aplicados.categoria,marca:aplicados.marca,subcategoria:aplicados.subcategoria,min:aplicados.min,max:aplicados.max,q:aplicados.busqueda,orden,idioma});for(const m of aplicados.marcasElegidas)parametros.append('marcas',m);
 if(orden==='recomendados'&&!aplicados.busqueda&&(historial.ids.length||(sesionIniciada&&favoritos.ids.length)))parametros.set('explorados',[...new Set([...historial.ids,...(sesionIniciada?favoritos.ids:[])])].slice(0,20).join(','));
 // Reset pagination only when the actual query changes. Search results update
 // exploration history themselves; including that unused history here makes
 // page 2 reset to page 1, which restores the old history and requests page 2 again.
 const clave=parametros.toString();
 const solicitada=paginacion.clave===clave?paginacion.pagina:1;
 parametros.set('pagina',String(solicitada));
 const consulta=parametros.toString();
 const [respuesta,setRespuesta]=useState<{consulta:string;datos:PaginaCatalogo}>({consulta:new URLSearchParams({categoria:categoriaInicial,marca:'',subcategoria:'',min:'',max:'',q:'',orden:'recomendados',idioma,pagina:'1'}).toString(),datos:inicial}),[error,setError]=useState('');
 const [intento,setIntento]=useState(0);
 const contextoRango=new URLSearchParams({categoria,subcategoria,marca,q:busqueda,orden:'menor'});for(const m of marcasElegidas)contextoRango.append('marcas',m);
 const claveRango=contextoRango.toString();
 const editandoRango=Boolean(filtrosPendientes);
 const [errorRango,setErrorRango]=useState(''),[intentoRango,setIntentoRango]=useState(0);
 const [rangoBorrador,setRangoBorrador]=useState<{clave:string;minimo:number;maximo:number}|null>(null);
 useEffect(()=>{
  if(!editandoRango)return;
  const abort=new AbortController();
  consultarJsonCatalogo<PaginaCatalogo>(`/api/catalogo?${claveRango}`,abort.signal).then((d:PaginaCatalogo)=>{if(abort.signal.aborted)return;setRangoBorrador({clave:claveRango,...d.rangoPrecios});setErrorRango('');}).catch(()=>{if(!abort.signal.aborted)setErrorRango(claveRango);});
  return()=>abort.abort();
 },[claveRango,editandoRango,intentoRango,intento]);
 const recordar=datos.recordar;
 const ultimaRecarga=useRef(0);
 useEffect(()=>{
  ultimaRecarga.current=Date.now();
  const refrescar=()=>{const ahora=Date.now();if(ahora-ultimaRecarga.current<1000)return;ultimaRecarga.current=ahora;setIntento(i=>i+1);};
  const alVolver=()=>{if(document.visibilityState==='visible'&&Date.now()-ultimaRecarga.current>=30000)refrescar();};
  document.addEventListener('visibilitychange',alVolver);window.addEventListener('online',refrescar);
  return()=>{document.removeEventListener('visibilitychange',alVolver);window.removeEventListener('online',refrescar);};
 },[]);
 const consultaInicial=useRef(respuesta.consulta),ultimaBusquedaMedida=useRef(''),filtrosMedidos=useRef<Record<string,string>|null>(null);
 useEffect(()=>{const actuales={categoria:aplicados.categoria,subcategoria:aplicados.subcategoria,marca:[aplicados.marca,...aplicados.marcasElegidas].join('|'),precio:aplicados.min+'|'+aplicados.max,orden};const anterior=filtrosMedidos.current;filtrosMedidos.current=actuales;if(anterior)for(const k of Object.keys(actuales) as (keyof typeof actuales)[])if(actuales[k]!==anterior[k])medir('filtro',k);},[aplicados.categoria,aplicados.subcategoria,aplicados.marca,aplicados.marcasElegidas,aplicados.min,aplicados.max,orden]);
 useEffect(()=>{
  if(consulta===consultaInicial.current&&intento===0)return;
  consultaInicial.current='';
  const abort=new AbortController();
  const timer=setTimeout(()=>consultarJsonCatalogo<PaginaCatalogo>(`/api/catalogo?${consulta}`,abort.signal).then((d:PaginaCatalogo)=>{if(abort.signal.aborted)return;ultimaRecarga.current=Date.now();setRespuesta({consulta,datos:d});const q=new URLSearchParams(consulta).get('q')??'';if(q&&q!==ultimaBusquedaMedida.current){ultimaBusquedaMedida.current=q;medir('busqueda');if(d.total===0)medir('busqueda_vacia');}else if(!q)ultimaBusquedaMedida.current='';if(new URLSearchParams(consulta).get('q'))recordarExploracion(d.productos.slice(0,4).map(p=>p.id));if(new URLSearchParams(consulta).get('q'))d.productos.slice(0,10).forEach(p=>medir('busqueda_producto',p.id));recordar(d.productos);setError('');}).catch(()=>{if(!abort.signal.aborted)setError(consulta);}),aplicados.busqueda||aplicados.min||aplicados.max?180:0);
  return ()=>{clearTimeout(timer);abort.abort();};
 },[consulta,recordar,intento,aplicados.busqueda,aplicados.min,aplicados.max]);
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
 function abrirFiltros(){setCategoriaExpandida('');setFiltrosPendientes({categoria,marca,subcategoria,marcasElegidas:[...marcasElegidas],min,max,busqueda});panelFiltros.current?.showModal();}
 function cerrarFiltros(aplicar=false){if(!aplicar&&filtrosPendientes){setCategoria(filtrosPendientes.categoria);setMarca(filtrosPendientes.marca);setSubcategoria(filtrosPendientes.subcategoria);setMarcasElegidas(filtrosPendientes.marcasElegidas);setMin(filtrosPendientes.min);setMax(filtrosPendientes.max);setBusqueda(filtrosPendientes.busqueda);}setFiltrosPendientes(null);panelFiltros.current?.close();if(aplicar)desplazarResultados.current=true;}
 function actualizarResultados(actualizar:()=>void){desplazarResultados.current=true;actualizar();}
 function seleccionarCategoria(id:string){
  if(categoria===id)return;
  setMin('');setMax('');
  if(filtrosPendientes){setCategoria(id);return;}
  actualizarResultados(()=>setCategoria(id));
 }
 // Una búsqueda nueva comienza en todo el catálogo; los filtros se pueden refinar después.
 function cambiarBusqueda(valor:string){
  setBusqueda(valor);setCategoria('todos');setSubcategoria('');setMarca('');setMarcasElegidas([]);
  setMin('');setMax('');setBuscarCategoria('');setBuscarMarca('');setCategoriaExpandida('');
  setPaginacion({clave:'',pagina:1});
 }
 const normalizarSugerencia=(texto:string)=>texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const terminoSugerencia=normalizarSugerencia(aplicados.busqueda);
 const sugerencias:SugerenciaCatalogo[]=terminoSugerencia.length<2?[]:[
  ...marcas.filter(m=>normalizarSugerencia(m).includes(terminoSugerencia)).slice(0,3).map(m=>({id:m,texto:m,tipo:'marca' as const})),
  ...datos.categorias.filter(c=>normalizarSugerencia(traducir(c.nombre,idioma)).includes(terminoSugerencia)).slice(0,2).map(c=>({id:c.id,texto:traducir(c.nombre,idioma),tipo:'categoria' as const})),
  ...(new URLSearchParams(respuesta.consulta).get('q')===aplicados.busqueda&&!cargando?respuesta.datos.productos.slice(0,3).map(p=>({id:p.slug||p.id,texto:traducir(p.nombre,idioma),tipo:'producto' as const})):[])
 ].slice(0,6);
 function elegirSugerencia(opcion:SugerenciaCatalogo){
  if(opcion.tipo==='producto'){router.push(`/tienda/${encodeURIComponent(opcion.id)}`);return;}
  cambiarBusqueda('');
  if(opcion.tipo==='marca')setMarca(opcion.id);
  if(opcion.tipo==='categoria')setCategoria(opcion.id);
 }
 function quitarBusqueda(){setMin('');setMax('');setBusqueda('');}
 function limpiarFiltros(){setBuscarCategoria('');setBuscarMarca('');setCategoria('todos');setSubcategoria('');setMarca('');setMarcasElegidas([]);setMin('');setMax('');setBusqueda('');}
 function botonLimpiar(){return <div className="shop-filtros-pie"><button type="button" className="shop-limpiar-filtros" disabled={!(categoria!=='todos'||subcategoria||marca||marcasElegidas.length||min||max||busqueda||buscarMarca||buscarCategoria)} onClick={limpiarFiltros}><RotateCcw size={16} aria-hidden="true"/>{s('limpiarFiltros')}</button></div>;}
 function categoriasIntegradas(){return <div className="shop-categorias-integradas"><input type="search" className="shop-buscar-marca" aria-label={s('buscarCategoria')} placeholder={s('buscarCategoria')} value={buscarCategoria} onChange={e=>setBuscarCategoria(e.target.value)}/><ListaFiltros className="shop-categorias" etiqueta={t('filtro')}>{datos.categorias.filter(c=>c.id===categoria||traducir(c.nombre,idioma).toLocaleLowerCase().includes(buscarCategoria.toLocaleLowerCase())).map(c=><div className={`shop-categoria-rama${c.id==='soluciones-empresariales'?' shop-categoria-empresa':''}`} key={c.id}><button aria-label={traducir(c.nombre,idioma)} aria-pressed={categoria===c.id} aria-expanded={categoriaExpandida===c.id} title={s(categoriaExpandida===c.id?'cerrarCategoria':'abrirCategoria')} onClick={()=>{if(categoria!==c.id)setSubcategoria('');setCategoriaExpandida(categoriaExpandida===c.id?'':c.id);seleccionarCategoria(c.id);}}>{c.id==='soluciones-empresariales'?<span className="shop-empresa-nombre">{traducir(c.nombre,idioma)}</span>:traducir(c.nombre,idioma)}<span className="shop-categoria-indicador"><span>{datos.conteos[c.id]??0}</span>{datos.subcategorias.some(x=>x.categoria===c.id)&&<ChevronDown className="shop-categoria-flecha" size={14} aria-hidden="true"/>}</span></button>{categoriaExpandida===c.id&&<div className="shop-subcategorias" role="group" aria-label={traducir(c.nombre,idioma)}>{datos.subcategorias.filter(x=>x.categoria===c.id).map(x=><button key={x.nombre.es} aria-pressed={subcategoria===x.nombre.es} onClick={()=>{setMin('');setMax('');setSubcategoria(x.nombre.es);}}>{traducir(x.nombre,idioma)}<span>{x.cantidad}</span></button>)}</div>}</div>)}</ListaFiltros></div>;}
 function filtroPrecio(){const rango=filtrosPendientes&&rangoBorrador?.clave===claveRango?rangoBorrador:respuesta.datos.rangoPrecios;return <><FiltroPrecio cargando={Boolean(filtrosPendientes&&rangoBorrador?.clave!==claveRango)} piso={rango?.minimo??datos.precioMinimo} limite={rango?.maximo??datos.precioMaximo} minimo={min} maximo={max} cambiar={(desde,hasta)=>{setMin(desde);setMax(hasta);}}/>{editandoRango&&errorRango===claveRango&&<p role="alert">{s('errorRangoPrecio')} <button type="button" onClick={()=>setIntentoRango(i=>i+1)}>{e('reintentar')}</button></p>}</>;}

 function conteoMarca(m:string){const conteo=datos.conteosMarcas[m];return categoria==='todos'?conteo?.total??0:subcategoria?conteo?.subcategorias[categoria+'|'+subcategoria]??0:conteo?.categorias[categoria]??0;}
 function filtrosAdicionales(){return <div className="shop-filtros-extra"><section className="shop-filtro-grupo shop-marcas-fijas"><h3 className="shop-marcas-titulo">{s('marcasFiltro')}</h3><div className="shop-marcas-cuerpo"><input className="shop-buscar-marca" type="search" aria-label={s('buscarMarca')} placeholder={s('buscarMarca')} value={buscarMarca} onChange={e=>setBuscarMarca(e.target.value)}/><ListaFiltros className="shop-marcas-opciones">{marcas.filter(m=>m.toLocaleLowerCase().includes(buscarMarca.toLocaleLowerCase())).filter(m=>conteoMarca(m)>0).slice().sort().map(m=><label key={m}><input type="checkbox" checked={marcasElegidas.includes(m)||marca===m} onChange={e=>{setMin('');setMax('');if(e.target.checked)setBusqueda('');const actuales=[...new Set([...marcasElegidas,...(marca?[marca]:[])])];setMarca('');setMarcasElegidas(e.target.checked?[...new Set([...actuales,m])]:actuales.filter(x=>x!==m));}}/><span><span className="shop-nombre-marca">{m}</span> <small>({conteoMarca(m)})</small></span></label>)}</ListaFiltros></div></section></div>;}
 function cambiarPagina(nueva:number){actualizarResultados(()=>setPaginacion({clave,pagina:nueva}));}
 return <>
  <h1 className="sr-only">{n('tienda')}</h1>
  {favoritos.error&&<small className="shop-favoritos-error" role="status">{f('sinSincronizar')}</small>}<MarcasDestacadas marcas={marcas} seleccionada={aplicados.marca} seleccionar={nombre=>actualizarResultados(()=>{setMin('');setMax('');setMarca(marca===nombre?'':nombre);setMarcasElegidas([]);setBuscarMarca('');setBuscarCategoria('');setCategoria('todos');setSubcategoria('');setBusqueda('');})}/>
  <div className="shop-busqueda-acciones"><BuscadorCatalogo valor={aplicados.busqueda} listo={preferenciasListas} cambiar={cambiarBusqueda} limpiar={quitarBusqueda} sugerencias={sugerencias} elegir={elegirSugerencia}/></div>

  <dialog ref={panelFiltros} className="shop-panel-filtros" aria-label={s('filtros')} onCancel={e=>{e.preventDefault();cerrarFiltros();}} onClick={e=>{if(e.target===e.currentTarget)cerrarFiltros();}}><button aria-label={s('cerrarFiltros')} onClick={()=>cerrarFiltros()}><X/></button><div className="modal-nativo-cuerpo"><h2>{s('filtros')}</h2>{filtroPrecio()}{categoriasIntegradas()}{filtrosAdicionales()}<div className="shop-panel-filtros-acciones"><button className="boton boton-azul" onClick={()=>cerrarFiltros(true)}>{s('verResultados')}</button>{botonLimpiar()}</div></div></dialog><div className="shop-distribucion" id="catalogo"><aside ref={sidebar} className="shop-sidebar" tabIndex={0} aria-label={s('filtros')}>{filtroPrecio()}<h2><SlidersHorizontal size={16}/>{s('categorias')}</h2>{categoriasIntegradas()}{filtrosAdicionales()}{botonLimpiar()}</aside>
  <section className="shop-resultados" aria-busy={cargando&&error!==consulta}><div className="shop-resultados-cabecera shop-controles-tienda" role="group" aria-label={s('controlesCatalogo')}><button className="boton boton-contorno shop-abrir-filtros" onClick={abrirFiltros}><SlidersHorizontal size={18}/>{s('filtros')}</button><div className="shop-conteo-ayuda"><div className="shop-filtros-activos">{aplicados.busqueda.trim()&&<button type="button" className="shop-filtro-busqueda" aria-label={`${t('limpiarBusqueda')}: ${aplicados.busqueda}`} onClick={quitarBusqueda}>{aplicados.busqueda}<X size={14} aria-hidden="true"/></button>}{[...(aplicados.categoria!=='todos'&&!aplicados.subcategoria?[{texto:nombreCategoria(aplicados.categoria),quitar:()=>{setMin('');setMax('');setCategoria('todos');setSubcategoria('');}}]:[]),...(aplicados.subcategoria?[{texto:traducir(datos.subcategorias.find(x=>x.nombre.es===aplicados.subcategoria)?.nombre??{es:aplicados.subcategoria,en:aplicados.subcategoria},idioma),quitar:()=>{setMin('');setMax('');setSubcategoria('');}}]:[]),...[...new Set([...aplicados.marcasElegidas,...(aplicados.marca?[aplicados.marca]:[])])].map(m=>({texto:m,quitar:()=>{setMin('');setMax('');if(marca===m)setMarca('');setMarcasElegidas(prev=>prev.filter(x=>x!==m));}}))].map(x=><button key={x.texto} onClick={x.quitar}>{x.texto}<X size={14}/></button>)}</div><p ref={resultados} tabIndex={-1} className="conteo" aria-live="polite"><span className="shop-conteo-completo">{cargando?t('cargando'):total===1?t('resultados',{cantidad:total}):s('productosEncontrados',{cantidad:new Intl.NumberFormat(idioma==='es'?'de-DE':'en-US').format(total)})}</span><span className="shop-conteo-corto" aria-hidden="true">{cargando?t('cargando'):s('conteoCompacto',{cantidad:total})}</span></p></div><OrdenCatalogo valor={orden} cambiar={setOrden} disabled={!preferenciasListas}/><AsesoriaWhatsApp etiqueta="asesorar" detalle={aplicados.categoria==='soluciones-empresariales'?se('consultaEmpresa'):undefined} className="shop-asesoria-inline"/><Link data-vacio={favoritos.ids.length===0} aria-hidden={favoritos.ids.length===0} tabIndex={favoritos.ids.length?undefined:-1} className="shop-favoritos-enlace" href="/favoritos" aria-label={`${f('favoritos')} (${favoritos.ids.length})`}><Heart className="shop-favoritos-icono" size={17} aria-hidden="true"/><IndicadorCantidad cantidad={favoritos.ids.length} clase="shop-favoritos-contador"/></Link></div>

  {error===consulta?<div className="estado-inline" role="alert"><p>{t('errorCarga')}</p><button className="boton boton-azul" onClick={()=>{setError('');setIntento(i=>i+1);}}>{e('reintentar')}</button></div>:null}
  {error===consulta&&!productosPagina.length?null:cargando&&(!productosPagina.length||!total)?<EsqueletoCatalogo texto={t('cargando')}/>:!total?<div className="catalogo-vacio"><Search size={30}/><h3>{aplicados.categoria==='soluciones-empresariales'?se('sinEquipos'):t('sinResultados')}</h3><p>{aplicados.categoria==='soluciones-empresariales'?se('asesoriaVacio'):t('intentarBusqueda')}</p>{aplicados.categoria==='soluciones-empresariales'&&<AsesoriaWhatsApp necesidad="negocio" detalle={se('mensajeProyecto',{solucion:nombreCategoria(aplicados.categoria)||se('titulo'),marca:[...new Set([...aplicados.marcasElegidas,...(aplicados.marca?[aplicados.marca]:[])])].join(', ')||se('marcaPorDefinir')})}/>}<button className="boton boton-contorno" onClick={limpiarFiltros}>{t('restablecer')}</button></div>:<div className="shop-grid" ref={cuadricula}>{productosPagina.map(p=><TarjetaProducto key={p.id} producto={p} favorito={favoritos.ids.includes(p.id)} cambiarFavorito={()=>favoritos.cambiar(p.id)} listo={favoritos.listo} bloqueado={cargando} categoria={nombreCategoria(p.categoria)}/>)}</div>}
  {!cargando&&paginas>1&&<nav className="shop-paginacion" aria-label={t('paginacion')}><button type="button" disabled={pagina===1} onClick={()=>cambiarPagina(pagina-1)}>{t('anterior')}</button><span role="status">{t('pagina',{pagina,total:paginas})}</span><button type="button" disabled={pagina===paginas} onClick={()=>cambiarPagina(pagina+1)}>{t('siguiente')}</button></nav>}
  </section></div>
 </>;
}
