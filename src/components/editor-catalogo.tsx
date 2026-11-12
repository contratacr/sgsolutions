'use client';

import {CampoFechaOferta} from './campo-fecha-oferta';
import {esProductoEurocomp,esProductoManual} from '@/lib/catalogo-fuente';
import Image from 'next/image';
import {tieneImagenProducto} from '@/lib/imagenes-productos';
import { useEffect, useMemo, useRef, useState, useTransition, useSyncExternalStore } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { MarcoModal } from '@/components/marco-modal';
import { motivosOcultoPublico, productoAgotado, productoEnOferta, origenProducto, MOTIVOS_OCULTO, EXISTENCIAS_MINIMAS_EUROCOMP, type MotivoOculto } from '@/lib/visibilidad-admin';
import { rutaProducto } from '@/lib/rutas-productos';
import { useLocale, useTranslations } from 'next-intl';
import { colones, preciosProducto,descuentosInvalidos,publicacionesManualesInvalidas,esquemaCatalogo, traducir, type CatalogoAdmin, type Texto } from '@/lib/catalogo-modelo';
import { useCambiosAdmin } from '@/components/use-cambios-admin';
import { GestorImagenes } from '@/components/gestor-imagenes';
import { guardarCatalogo,actualizarCatalogo } from '@/app/panel/catalogo/acciones';
import { ErroresAdmin, enfocarRegistro, type CampoAdmin } from '@/components/errores-admin';

const suscribirListo=()=>()=>{};
const listoCliente=()=>true,listoServidor=()=>false;

type Producto = CatalogoAdmin['productos'][number];
const POR_PAGINA = 20;
const FILTROS_ESTADO = ['todos', 'publicados', 'borradores', 'visibles', 'ocultos', 'agotados', 'oferta', 'sinFoto'] as const;
const PESTANAS = ['productos', 'categorias', 'textos'] as const;
type Diagnostico = { motivos: MotivoOculto[]; agotado: boolean; oferta: boolean; sinFoto: boolean; origen: ReturnType<typeof origenProducto> };

/** Visibility chip shared by the list and the editor. The reason is always written, never colour-only. */
function EstadoVisibilidad({ motivos }: { motivos: MotivoOculto[] }) {
  const t = useTranslations('AdminCatalogo');
  if (!motivos.length) return <span className="panel-chip" data-tono="exito">{t('visibleTienda')}</span>;
  return <span className="catalogo-visibilidad"><span className="panel-chip" data-tono="aviso">{t('ocultoPublico')}</span><small>{t('motivo', { motivos: motivos.map(m => t(`motivos.${m}`)).join(' · ') })}</small></span>;
}

function Bilingue({ titulo, valor, cambiar, multilinea = false }: { titulo: string; valor: Texto; cambiar: (v: Texto) => void; multilinea?: boolean }) {
  const t = useTranslations('AdminUX');
  return <div className="admin-bilingue">
    {(['es', 'en'] as const).map(lengua => <label key={lengua}>{titulo} ({t(lengua === 'es' ? 'idiomaEs' : 'idiomaEn')}){multilinea
      ? <textarea required maxLength={2000} rows={3} value={valor[lengua]} onChange={e => cambiar({ ...valor, [lengua]: e.target.value })} />
      : <input required maxLength={250} value={valor[lengua]} onChange={e => cambiar({ ...valor, [lengua]: e.target.value })} />}</label>)}
  </div>;
}

function EditorProducto({ p, i, datos, idioma, motivos, enlaceTienda, cambiar, cambiarPrecioManual, restaurarPrecioProveedor, eliminar, onBusy }: {
  p: Producto;
  i: number;
  datos: CatalogoAdmin;
  idioma: string;
  motivos: MotivoOculto[];
  enlaceTienda: string | null;
  cambiar: (indice: number, cambios: Partial<Producto>) => void;
  cambiarPrecioManual: (indice: number, valor: string) => void;
  restaurarPrecioProveedor: (indice: number) => void;
  eliminar: (indice: number) => void;
  onBusy: (busy: boolean) => void;
}) {
  const t = useTranslations('AdminCatalogo');
  const u = useTranslations('AdminUX');
  const precio = preciosProducto(p,datos.ajustes).precio;
  // The offer must stay below the effective normal price (manual or supplier-derived).
  const precioNormal = preciosProducto({ ...p, precioDescuento: null }, datos.ajustes).precio;
  const seccion = (nombre: string) => `${p.id}-${nombre}`;
  return <section className="admin-producto-editor" id={p.id} aria-label={u('editarProducto', { nombre: traducir(p.nombre, idioma) || t('nuevoProducto') })}>
    <div className="admin-editor-cabecera">
      <div className="admin-editor-identidad"><Image src={p.imagen} alt="" width={70} height={70} unoptimized/><div><span className="admin-kicker">{u('edicion')}</span><h2>{traducir(p.nombre, idioma) || t('nuevoProducto')}</h2><p>{p.codigoFabricante || u('sinCodigo')}</p></div></div>
      <div className="admin-editor-cabecera-acciones catalogo-editor-estado"><span className="panel-chip" data-tono="neutro">{p.publicado ? t('estadoPublicado') : t('borrador')}</span><EstadoVisibilidad motivos={motivos} />{enlaceTienda && <a className="boton boton-contorno" href={enlaceTienda}>{t('verTienda')}</a>}</div>
    </div>
    <nav className="admin-editor-indice" aria-label={u('seccionesProducto')}>{[['basico',u('basico')],['imagenes',u('imagenes')],['especificaciones',u('especificaciones')],['publicacion',u('publicacion')],['precios',u('precios')],['inventario',u('inventario')]].map(([id,etiqueta]) => <a key={id} href={`#${seccion(id)}`} onClick={() => { const destino = document.getElementById(seccion(id)); if (destino instanceof HTMLDetailsElement) destino.open = true; }}>{etiqueta}</a>)}</nav>
    <div className="admin-producto-formulario">
<div className="admin-producto-principal">    <section className="admin-producto-seccion" id={seccion('basico')}>
      <div className="admin-producto-seccion-cabecera"><div><h3>{u('basico')}</h3></div></div>
      <div className="admin-fields">
        <Bilingue titulo={t('nombre')} valor={p.nombre} cambiar={nombre => cambiar(i, { nombre })} />
        <Bilingue titulo={t('descripcionCampo')} valor={p.descripcion} multilinea cambiar={descripcion => cambiar(i, { descripcion })} />
        <label>{t('categoria')}<select value={p.categoria} onChange={e => cambiar(i, { categoria: e.target.value })}>{datos.categorias.map(c => <option key={c.id} value={c.id}>{traducir(c.nombre, idioma)}</option>)}</select></label>
        <label>{t('marca')}<input value={p.marca} maxLength={80} onChange={e => cambiar(i, { marca: e.target.value })} /></label>
        <label>{t('codigoFabricante')}<input value={p.codigoFabricante} maxLength={100} onChange={e => cambiar(i, { codigoFabricante: e.target.value })} /></label>
      </div>
    </section>
    <section className="admin-producto-seccion" id={seccion('imagenes')}>
      <div className="admin-producto-seccion-cabecera"><div><h3>{u('imagenes')}</h3></div></div>
      {!tieneImagenProducto(p)&&<p role="status">{u('imagenPendientePublicacion')}</p>}
      <GestorImagenes onBusy={onBusy} fotos={[...new Set([p.imagen, ...p.imagenes])].filter(src => src !== '/imagenes/producto-sin-imagen.svg').map(src => ({ src }))} cambiar={fotos => cambiar(i, { imagen: fotos[0]?.src ?? '/imagenes/producto-sin-imagen.svg', imagenes: fotos.slice(1).map(f => f.src) })} />
      <label>{t('fichaTecnica')}<input type="url" value={p.fichaTecnica ?? ''} onChange={e => cambiar(i, { fichaTecnica: e.target.value || undefined })} /></label>
    </section>
    <details className="admin-producto-seccion admin-editor-seccion" id={seccion('especificaciones')}><summary><strong>{u('especificaciones')} ({p.especificaciones.length})</strong></summary>
      <button className="boton boton-contorno" type="button" onClick={() => cambiar(i, { especificaciones: [...p.especificaciones, { nombre: { es: '', en: '' }, valor: { es: '', en: '' } }] })}>{t('nuevaEspecificacion')}</button>
      {p.especificaciones.map((e, j) => <div className="admin-especificacion" key={j}>
        <Bilingue titulo={t('nombre')} valor={e.nombre} cambiar={nombre => cambiar(i, { especificaciones: p.especificaciones.map((x, k) => k === j ? { ...x, nombre } : x) })} />
        <Bilingue titulo={t('valor')} valor={e.valor} cambiar={valor => cambiar(i, { especificaciones: p.especificaciones.map((x, k) => k === j ? { ...x, valor } : x) })} />
        <button className="boton boton-contorno" type="button" onClick={() => cambiar(i, { especificaciones: p.especificaciones.filter((_, k) => k !== j) })}>{t('quitarEspecificacion')}</button>
      </div>)}
    </details>
</div><aside className="admin-producto-lateral" aria-label={u('ventaPublicacion')}>     <section className="admin-producto-seccion" id={seccion('publicacion')}>
      <div className="admin-producto-seccion-cabecera"><div><h3>{u('publicacion')}</h3><p>{u('publicacionAyuda')}</p></div></div>
      <label className="admin-check admin-opcion"><input type="checkbox" checked={p.publicado} onChange={e => cambiar(i, { publicado: e.target.checked })} />{t('publicado')}</label>
      {p.publicado && p.eurocomp && p.eurocomp.stock < EXISTENCIAS_MINIMAS_EUROCOMP && <p className="panel-aviso" role="status">{t('avisoEurocomp', { stock: p.eurocomp.stock, minimo: EXISTENCIAS_MINIMAS_EUROCOMP })}</p>}
      <label className="admin-check admin-opcion"><input type="checkbox" checked={p.destacado} onChange={e => cambiar(i, { destacado: e.target.checked })} />{t('destacado')}</label><small>{t('destacadoNota')}</small>
    </section>
    <section className="admin-producto-seccion" id={seccion('precios')}>
      <div className="admin-producto-seccion-cabecera"><div><h3>{u('precios')}</h3></div></div>
      <div className="admin-precio-resumen"><span>{t('precioFinal')}</span><strong>{precio === null ? t('sinPrecio') : colones(precio)}</strong></div>
      <div className="admin-fields">
        <label>{t('precioManual')}<input type="number" step="1" min="1" value={p.precioManual ?? ''} onChange={e => cambiarPrecioManual(i, e.target.value)} onBlur={() => restaurarPrecioProveedor(i)} /><small>{t('manualNota')}</small></label>
        <label>{t('precioDescuento')}<input type="number" step="1" min="1" max={precioNormal!==null?precioNormal-1:undefined} value={p.precioDescuento??''} onChange={e=>cambiar(i,{precioDescuento:e.target.value===''?null:Number(e.target.value),...(e.target.value===''?{ofertaInicio:null,ofertaFin:null,ofertaPrioritaria:false}:{})})}/><small>{t('descuentoNota')}</small>{p.precioDescuento!=null&&preciosProducto({...p,ofertaInicio:null,ofertaFin:null},datos.ajustes).precioOriginal===null&&<small role="alert">{t('descuentoInvalido')}</small>}</label>
        {esProductoEurocomp(p)&&<label className="admin-check admin-oferta-ancho"><input type="checkbox" checked={p.precioFijado??false} onChange={e=>cambiar(i,{precioFijado:e.target.checked})}/>{t('protegerPrecio')}</label>}
        <p className="admin-oferta-ancho admin-oferta-automatica">{t('ofertaAutomatica')}</p>
        <label>{t('ofertaInicio')}<CampoFechaOferta valor={p.ofertaInicio} cambiar={ofertaInicio=>cambiar(i,{ofertaInicio})}/></label>
        <label>{t('ofertaFin')}<CampoFechaOferta valor={p.ofertaFin} cambiar={ofertaFin=>cambiar(i,{ofertaFin})}/></label>
        <small className="admin-oferta-ancho">{t('ofertaFechasNota')}</small>

      </div>
    </section>
<section className="admin-producto-seccion" id={seccion('inventario')}><div className="admin-producto-seccion-cabecera"><div><h3>{u('inventario')}</h3></div></div><div className="admin-fields">        {esProductoManual(p)&&<><label className="admin-check"><input type="checkbox" checked={p.stockManual!=null} onChange={e=>cambiar(i,{stockManual:e.target.checked?0:null,...(!e.target.checked?{disponibilidadReferencia:'proveedor' as const}:{})})}/>{t('controlExistencias')}</label>{p.stockManual!=null&&<label>{t('existenciasManuales')}<input type="number" min="0" max="1000000" step="1" inputMode="numeric" value={p.stockManual} onChange={e=>{const valor=e.currentTarget.value.replace(/^0+(?=\d)/,'');e.currentTarget.value=valor;cambiar(i,{stockManual:Number(valor)});}} onBlur={e=>{e.currentTarget.value=String(p.stockManual??0);}}/><small>{t('existenciasNota')}</small></label>}</>}
        {!(esProductoManual(p)&&p.stockManual!=null)&&<label>{t('disponibilidadManual')}<select value={p.disponibilidadReferencia} onChange={e=>cambiar(i,{disponibilidadReferencia:e.target.value as Producto['disponibilidadReferencia']})}><option value="consultar">{t('disponibilidadConsultar')}</option><option value="proveedor">{t('disponibilidadPedido')}</option><option value="agotado">{t('disponibilidadAgotado')}</option></select></label>}</div></section>    <section className="admin-producto-eliminar"><p>{u('eliminarAyuda')}</p>
      <Dialog.Root><Dialog.Trigger asChild><button className="boton boton-contorno" type="button">{t('quitar')}</button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="cambios-panel-fondo"/><MarcoModal className="cambios-panel-modal" etiquetaCerrar={t('cancelar')}><Dialog.Title>{t('eliminarTitulo')}</Dialog.Title><Dialog.Description>{u('confirmarEliminar')}</Dialog.Description><div><Dialog.Close className="boton boton-contorno">{t('cancelar')}</Dialog.Close><button type="button" className="boton catalogo-boton-peligro" onClick={() => eliminar(i)}>{t('quitar')}</button></div></MarcoModal></Dialog.Portal></Dialog.Root>
    </section></aside>
    </div>
  </section>;
}

type PrecioProveedor = Pick<Producto, 'costoUsd' | 'costoCrc' | 'precioReferencia' | 'precioManual' | 'precioFijado'>;

export function EditorCatalogo({ inicial, revisionInicial, productoInicial }: { inicial: CatalogoAdmin; revisionInicial: number; productoInicial?: string }) {
  const listo=useSyncExternalStore(suscribirListo,listoCliente,listoServidor);
  const t = useTranslations('AdminCatalogo');
  const u = useTranslations('AdminUX');
  const m = useTranslations('AdminImagenes');
  const idioma = useLocale();
  const [datos, setDatos] = useState(inicial);
  const [ultimoGuardado, setUltimoGuardado] = useState(inicial);
  const [revision, setRevision] = useState(revisionInicial);
  const [tab, setTab] = useState('productos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [categoriaFiltro,setCategoriaFiltro]=useState('todos');
  const [buscar, setBuscar] = useState('');
  const [paginaAdmin, setPaginaAdmin] = useState(1);
  const [origenFiltro, setOrigenFiltro] = useState('todos');
  const [editorId, setEditorId] = useState<string | null>(() => productoInicial && inicial.productos.some(p => p.id === productoInicial) ? productoInicial : null);
  const [descartarAbierto, setDescartarAbierto] = useState(false);
  const [revisionAbierta, setRevisionAbierta] = useState(false);
  const [confirmarCarga, setConfirmarCarga] = useState(false);
  // Supplier-derived values of the draft, kept so clearing a manual price restores them (B6).
  const preciosProveedor = useRef(new Map<string, PrecioProveedor>());
  const [estado, setEstado] = useState('');
  const [campos, setCampos] = useState<CampoAdmin[]>([]);
  const [cargandoImagenes, setCargandoImagenes] = useState(false);
  const [ocupado, iniciar] = useTransition();
  const { pendientes, confirmarGuardado } = useCambiosAdmin(datos);
  const listaRef = useRef<HTMLDivElement>(null);
  const editorRef=useRef<HTMLDivElement>(null),accionesRef=useRef<HTMLDivElement>(null);
  const [versionReciente,setVersionReciente]=useState<{catalogo:CatalogoAdmin;revision:number}|null>(null);
  // In the product list the save bar only appears while there is something to save or report, so it does not cover filters on mobile.
  // Inside a product editor it is always available (partial fields may not count as changes yet). A successful save stays announced briefly.
  const mostrarBarra = pendientes || ocupado || estado !== '' || (tab === 'productos' && editorId !== null);
  useEffect(()=>{if(estado!=='guardado'||pendientes)return;const espera=setTimeout(()=>setEstado(''),6000);return()=>clearTimeout(espera);},[estado,pendientes]);
  useEffect(()=>{
    const editor=editorRef.current,barra=accionesRef.current;if(!editor||!barra)return;
    const medir=()=>{const r=editor.getBoundingClientRect();barra.style.left=`${r.left}px`;barra.style.width=`${r.width}px`;editor.style.setProperty('--acciones-altura',`${barra.getBoundingClientRect().height+24}px`);};
    const observer=new ResizeObserver(medir);observer.observe(editor);observer.observe(barra);window.addEventListener('resize',medir);medir();
    return()=>{observer.disconnect();window.removeEventListener('resize',medir);};
  },[mostrarBarra]);
  function revisarVersion(){
    iniciar(async()=>{try{const r=await actualizarCatalogo(revision);if(r.catalogo&&typeof r.revision==='number'){setVersionReciente({catalogo:r.catalogo,revision:r.revision});setConfirmarCarga(false);setRevisionAbierta(true);}else if('sinCambios' in r&&r.sinCambios)setEstado('sinCambiosNuevos');else if(r.error)setEstado(r.error);}catch{setEstado('error');}});
  }


  // A mounted editor otherwise keeps its initial stock forever, even after another
  // administrator saves. Refresh only clean forms; never replace a local draft.
  useEffect(()=>{
    if(ocupado||pendientes||cargandoImagenes)return;
    let cancelado=false,enCurso=false;
    const recuperar=async()=>{
      if(cancelado||enCurso||document.visibilityState!=='visible')return;
      enCurso=true;
      try{
        const r=await actualizarCatalogo(revision);
        if(!cancelado&&r.catalogo&&typeof r.revision==='number'&&r.revision>revision){
          setDatos(r.catalogo);setUltimoGuardado(r.catalogo);confirmarGuardado(r.catalogo);setRevision(r.revision);setEstado('');preciosProveedor.current.clear();
        }
      }catch{/* Keep the confirmed snapshot; saving still enforces database revision. */}
      finally{enCurso=false;}
    };
    const visible=()=>{if(document.visibilityState==='visible')void recuperar();};
    window.addEventListener('focus',recuperar);window.addEventListener('pageshow',recuperar);
    document.addEventListener('visibilitychange',visible);
    const intervalo=setInterval(recuperar,60000);
    return()=>{cancelado=true;clearInterval(intervalo);window.removeEventListener('focus',recuperar);window.removeEventListener('pageshow',recuperar);document.removeEventListener('visibilitychange',visible);};
  },[revision,ocupado,pendientes,cargandoImagenes,confirmarGuardado]);

  const diagnostico = useMemo(() => new Map<string, Diagnostico>(datos.productos.map(p => [p.id, { motivos: motivosOcultoPublico(p, datos.ajustes), agotado: productoAgotado(p), oferta: productoEnOferta(p, datos.ajustes), sinFoto: !tieneImagenProducto(p), origen: origenProducto(p) }])), [datos.productos, datos.ajustes]);
  // Status and source filters, without category or search, so category counts are not recalculated per keystroke.
  const filtradosEstado = useMemo(() => datos.productos.map((p, i) => ({ p, i })).filter(({ p }) => {
    const d = diagnostico.get(p.id)!;
    if (origenFiltro !== 'todos' && d.origen !== origenFiltro) return false;
    switch (filtroEstado) {
      case 'publicados': return p.publicado;
      case 'borradores': return !p.publicado;
      case 'visibles': return !d.motivos.length;
      case 'ocultos': return d.motivos.length > 0;
      case 'agotados': return d.agotado;
      case 'oferta': return d.oferta;
      case 'sinFoto': return d.sinFoto;
      default: return filtroEstado.startsWith('oculto-') ? d.motivos.includes(filtroEstado.slice(7) as MotivoOculto) : true;
    }
  }), [datos.productos, diagnostico, filtroEstado, origenFiltro]);
  const conteoCategorias = useMemo(() => { const conteo = new Map<string, number>(); for (const { p } of filtradosEstado) conteo.set(p.categoria, (conteo.get(p.categoria) ?? 0) + 1); return conteo; }, [filtradosEstado]);
  const seleccion = useMemo(() => { const termino = buscar.trim().toLocaleLowerCase(); return filtradosEstado.filter(({ p }) => (categoriaFiltro === 'todos' || p.categoria === categoriaFiltro) && `${p.nombre.es} ${p.nombre.en} ${p.codigoFabricante} ${p.marca}`.toLocaleLowerCase().includes(termino)); }, [filtradosEstado, categoriaFiltro, buscar]);
  const paginasAdmin = Math.max(1, Math.ceil(seleccion.length / POR_PAGINA));
  const paginaVisible = Math.min(paginaAdmin, paginasAdmin);
  const visibles = seleccion.slice((paginaVisible - 1) * POR_PAGINA, paginaVisible * POR_PAGINA);
  const productoAbierto = editorId ? datos.productos.findIndex(p => p.id === editorId) : -1;
  const guardadoAbierto = editorId ? ultimoGuardado.productos.find(p => p.id === editorId) : undefined;
  const motivosGuardado = guardadoAbierto ? motivosOcultoPublico(guardadoAbierto, ultimoGuardado.ajustes) : null;
  // Only link to the public page when the saved version is actually shown in the store.
  const enlaceTienda = guardadoAbierto && motivosGuardado && !motivosGuardado.length ? rutaProducto(guardadoAbierto) : null;

  useEffect(() => { if (editorId && tab === 'productos') enfocarRegistro(editorId); }, [editorId, paginaVisible, tab]);

  function cambiarProducto(indice: number, cambios: Partial<Producto>) {
    setDatos(d => ({ ...d, productos: d.productos.map((p, i) => i === indice ? { ...p, ...cambios } : p) }));
    setEstado('');
  }

  function cambiarPrecioManual(indice: number, valor: string) {
    const p = datos.productos[indice]; if (!p) return;
    if (!preciosProveedor.current.has(p.id)) preciosProveedor.current.set(p.id, { costoUsd: p.costoUsd, costoCrc: p.costoCrc, precioReferencia: p.precioReferencia, precioManual: p.precioManual, precioFijado: p.precioFijado });
    const original = preciosProveedor.current.get(p.id)!;
    // Saved data model is unchanged: a manual price still clears supplier costs; clearing it restores them.
    cambiarProducto(indice, valor === '' ? { precioManual: null, precioFijado: original.precioFijado ?? false, costoUsd: original.costoUsd, costoCrc: original.costoCrc, precioReferencia: original.precioReferencia } : { precioManual: Number(valor), precioFijado: true, precioReferencia: null, costoUsd: null, costoCrc: null });
  }

  /** Eurocomp prices live in precioManual; leaving the field empty would hide the price, so restore the supplier price on blur. */
  function restaurarPrecioProveedor(indice: number) {
    const p = datos.productos[indice], original = p && preciosProveedor.current.get(p.id);
    if (p && original && p.precioManual === null && esProductoEurocomp(p) && original.precioManual !== null) cambiarProducto(indice, { precioManual: original.precioManual, precioFijado: original.precioFijado ?? false });
  }

  function descartarCambios() {
    setDatos(ultimoGuardado); setCampos([]); setEstado(''); setEditorId(null); preciosProveedor.current.clear(); setDescartarAbierto(false);
  }

  function cargarVersionReciente() {
    if (!versionReciente) return;
    setDatos(versionReciente.catalogo); setUltimoGuardado(versionReciente.catalogo); confirmarGuardado(versionReciente.catalogo); setRevision(versionReciente.revision); setCampos([]); setEstado(''); preciosProveedor.current.clear(); setConfirmarCarga(false); setRevisionAbierta(false);
  }

  function irPagina(pagina: number) {
    setPaginaAdmin(pagina);
    setEditorId(null);
    requestAnimationFrame(() => listaRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  }

  function abrirProducto(id: string) {
    setEditorId(id);
    if (editorId === id) enfocarRegistro(id);
  }

  function cerrarProducto() {
    setEditorId(null);
    requestAnimationFrame(() => listaRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  }

  function abrirCampo(campo: CampoAdmin) {
    // Unknown groups (e.g. ajustes) have no tab of their own; fall back to products instead of a blank view.
    const grupo = (PESTANAS as readonly string[]).includes(String(campo[0])) ? String(campo[0]) : 'productos';
    setTab(grupo);
    if (grupo === 'productos') {
      const indice = Number(campo[1]);
      setBuscar(''); setFiltroEstado('todos'); setOrigenFiltro('todos'); setCategoriaFiltro('todos'); setPaginaAdmin(Math.floor(indice / POR_PAGINA) + 1);
      setEditorId(datos.productos[indice]?.id ?? null);
    } else if (grupo === 'categorias') {
      requestAnimationFrame(() => enfocarRegistro(datos.categorias[Number(campo[1])]?.id));
    } else if (grupo === 'textos') requestAnimationFrame(() => enfocarRegistro('admin-textos'));
    else { setEditorId(null); requestAnimationFrame(() => listaRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })); }
  }

  function guardar() {
    if(ocupado||cargandoImagenes)return;
    for(const fecha of document.querySelectorAll<HTMLInputElement>('.admin-producto-editor input[type="datetime-local"]'))if(!fecha.reportValidity())return;
    const validado = esquemaCatalogo.safeParse(datos);
    if (!validado.success) { setCampos(validado.error.issues.map(x => x.path.map(k => typeof k === 'number' ? k : String(k)))); setEstado('validacion'); return; }
    const ofertasInvalidas=descuentosInvalidos(validado.data);
    if(ofertasInvalidas.length){setCampos(ofertasInvalidas.map(i=>['productos',i,'precioDescuento']));setEstado('validacion');return;}
    const publicacionesInvalidas=publicacionesManualesInvalidas(validado.data);
    if(publicacionesInvalidas.length){setCampos(publicacionesInvalidas.map(i=>['productos',i,'publicado']));setEstado('publicacionInvalida');return;}
    setCampos([]);setEstado('guardando');
    iniciar(async () => {
      try {
        const respuesta = await guardarCatalogo(validado.data, revision);
        if (respuesta.error) setEstado(respuesta.error);
        else if(!Number.isInteger(respuesta.revision)||respuesta.revision!==revision+1)setEstado('error');
        else { setDatos(validado.data); confirmarGuardado(validado.data); setUltimoGuardado(validado.data); setRevision(respuesta.revision!); setEstado('guardado'); preciosProveedor.current.clear(); }
      } catch { setEstado('error'); }
    });
  }

  function paginacion() {
    if (paginasAdmin <= 1) return null;
    return <nav className="admin-paginacion" aria-label={t('paginasProductos')}>
      <button type="button" disabled={paginaVisible === 1} onClick={() => irPagina(paginaVisible - 1)}>{t('anterior')}</button>
      <label><span className="sr-only">{u('irPagina')}</span><select value={paginaVisible} onChange={e => irPagina(Number(e.target.value))}>{Array.from({ length: paginasAdmin }, (_, i) => <option key={i} value={i + 1}>{t('pagina', { pagina: i + 1, total: paginasAdmin })}</option>)}</select></label>
      <button type="button" disabled={paginaVisible === paginasAdmin} onClick={() => irPagina(paginaVisible + 1)}>{t('siguiente')}</button>
    </nav>;
  }

  return <div ref={editorRef} className={`admin-editor admin-tienda catalogo-editor${mostrarBarra ? ' admin-guardado-fijo' : ''}`}>
    <div className="admin-tabs" role="group" aria-label={t('titulo')}>{PESTANAS.map(k => <button type="button" aria-pressed={tab === k} onClick={() => { setTab(k); setEditorId(null); }} key={k}>{t(k)}</button>)}</div>
    <fieldset disabled={ocupado || cargandoImagenes} className="admin-tienda-cuerpo">
      {tab === 'productos' && editorId && productoAbierto >= 0 ? <div className="admin-edicion-vista">
        <button type="button" className="admin-volver-lista" onClick={cerrarProducto}>{u('volverLista')}</button>
        <EditorProducto p={datos.productos[productoAbierto]} i={productoAbierto} datos={datos} idioma={idioma} motivos={diagnostico.get(editorId)?.motivos ?? []} enlaceTienda={enlaceTienda} cambiar={cambiarProducto} cambiarPrecioManual={cambiarPrecioManual} restaurarPrecioProveedor={restaurarPrecioProveedor} onBusy={setCargandoImagenes} eliminar={indice => { setDatos(d => ({ ...d, productos: d.productos.filter((_, j) => indice !== j) })); cerrarProducto(); }} />
      </div> : tab === 'productos' && <>
        <div className="admin-lista-cabecera" ref={listaRef}>
          <button type="button" className="boton boton-azul" disabled={datos.productos.length>=20000} onClick={()=>{const id=`manual-${crypto.randomUUID()}`;const producto:Producto={id,origen:'manual',categoria:datos.categorias[0].id,nombre:{es:'',en:''},descripcion:{es:'',en:''},imagen:'/imagenes/producto-sin-imagen.svg',imagenes:[],especificaciones:[],marca:'',codigoFabricante:'',stockManual:0,inventarioPropio:false,costoUsd:null,costoCrc:null,precioReferencia:null,precioManual:null,precioDescuento:null,disponibilidadReferencia:'consultar',revisionPrecio:false,publicado:false,destacado:false};setDatos(d=>({...d,productos:[producto,...d.productos]}));setFiltroEstado('todos');setOrigenFiltro('todos');setCategoriaFiltro('todos');setBuscar('');setPaginaAdmin(1);setEditorId(id);setEstado('');}}>{t('agregarProducto')}</button>
          <div><h2>{t('productos')}</h2><p>{u('resultados', { cantidad: seleccion.length })} · {u('mostrando', { inicio: seleccion.length ? (paginaVisible - 1) * POR_PAGINA + 1 : 0, fin: Math.min(paginaVisible * POR_PAGINA, seleccion.length) })}</p></div>
        </div>
        <div className="admin-lista-filtros catalogo-filtros">
          <label>{t('categoria')}<select value={categoriaFiltro} onChange={e=>{setCategoriaFiltro(e.target.value);setPaginaAdmin(1);setEditorId(null);}}><option value="todos">{u('todos')}</option>{datos.categorias.map(c=><option key={c.id} value={c.id}>{traducir(c.nombre,idioma)} ({conteoCategorias.get(c.id) ?? 0})</option>)}</select></label>
          <label>{t('buscarProductos')}<input type="search" disabled={!listo} value={buscar} onChange={e => { setBuscar(e.target.value); setPaginaAdmin(1); setEditorId(null); }} /></label>
          <label>{u('estado')}<select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPaginaAdmin(1); setEditorId(null); }}>{FILTROS_ESTADO.map(k => <option key={k} value={k}>{['todos', 'publicados', 'borradores'].includes(k) ? u(k) : t(`filtros.${k}`)}</option>)}<optgroup label={t('filtros.motivoOculto')}>{MOTIVOS_OCULTO.map(m => <option key={m} value={`oculto-${m}`}>{t('filtros.oculto', { motivo: t(`motivos.${m}`) })}</option>)}</optgroup></select></label>
          <label>{t('origen')}<select value={origenFiltro} onChange={e => { setOrigenFiltro(e.target.value); setPaginaAdmin(1); setEditorId(null); }}>{['todos', 'manual', 'eurocomp', 'empresarial', 'software'].map(k => <option key={k} value={k}>{k === 'todos' ? u('todos') : t(`origenes.${k}`)}</option>)}</select></label>
        </div>
        {seleccion.length ? <>{paginacion()}<div className="admin-productos-lista">{visibles.map(({ p }) => {
          const precio = preciosProducto(p,datos.ajustes).precio;
          return <div className="admin-producto-contenedor" key={p.id}><div className="admin-producto-fila">
            <div className="admin-producto-foto"><Image src={p.imagen} alt="" width={64} height={64} unoptimized /></div>
            <div className="admin-producto-datos"><strong>{traducir(p.nombre, idioma) || t('nuevoProducto')}</strong><span>{p.marca || u('sinMarca')} · {p.codigoFabricante || u('sinCodigo')}</span></div>
            <div className="admin-producto-estado catalogo-fila-estado"><span className="panel-chip" data-tono="neutro">{p.publicado ? t('estadoPublicado') : t('borrador')}</span><EstadoVisibilidad motivos={diagnostico.get(p.id)?.motivos ?? []} /><strong>{precio === null ? t('sinPrecio') : colones(precio)}</strong></div>
            <button type="button" className="boton boton-contorno" onClick={() => abrirProducto(p.id)}>{u('editar')}</button>
          </div></div>;
        })}</div>{paginacion()}</> : <p className="admin-lista-vacia">{u('vacio')}</p>}
      </>}
      {tab === 'categorias' && <><div className="admin-lista-cabecera"><div><h2>{t('categorias')}</h2><p>{u('categoriasAyuda')}</p></div><button type="button" className="boton boton-azul" onClick={() => { const id = `categoria-${crypto.randomUUID().slice(0, 8)}`; setDatos(d => ({ ...d, categorias: [{ id, nombre: { es: '', en: '' } }, ...d.categorias] })); setEstado(''); requestAnimationFrame(() => enfocarRegistro(id)); }}>{t('nuevaCategoria')}</button></div><div className="admin-categorias-grid">{datos.categorias.map((c, i) => <div className="admin-item" key={c.id} id={c.id}><div className="admin-fields"><Bilingue titulo={t('nombre')} valor={c.nombre} cambiar={nombre => setDatos(d => ({ ...d, categorias: d.categorias.map((x, j) => j === i ? { ...x, nombre } : x) }))} /></div><button type="button" className="boton boton-contorno" disabled={datos.categorias.length === 1 || datos.productos.some(p => p.categoria === c.id)} onClick={() => setDatos(d => ({ ...d, categorias: d.categorias.filter((_, j) => j !== i) }))}>{t('quitar')}</button><p>{t('categoriaNota')}</p></div>)}</div></>}
      {tab === 'textos' && <section className="admin-configuracion"><h2>{t('textos')}</h2><p>{u('textosAyuda')}</p><div id="admin-textos" className="admin-fields">{(['titulo', 'descripcion', 'aviso'] as const).map(k => <Bilingue key={k} titulo={t(k === 'titulo' ? 'tituloTienda' : k === 'descripcion' ? 'descripcionCampo' : 'aviso')} valor={datos.textos[k]} multilinea={k !== 'titulo'} cambiar={valor => setDatos(d => ({ ...d, textos: { ...d.textos, [k]: valor } }))} />)}</div></section>}
    </fieldset>
    <ErroresAdmin campos={campos} abrir={abrirCampo} />
    {mostrarBarra ? <div ref={accionesRef} className="admin-actions"><button type="button" className="boton boton-azul" disabled={ocupado || cargandoImagenes} onClick={guardar}>{t(ocupado ? 'guardando' : 'guardar')}</button><button type="button" className="boton boton-contorno" disabled={ocupado || cargandoImagenes || !pendientes} onClick={() => setDescartarAbierto(true)}>{t('restablecer')}</button><span role="status">{estado && estado !== 'guardado' ? t(estado) : pendientes ? m('pendientes') : estado ? t(estado) : t('notaGuardar')}</span>{estado==='conflicto'&&<button type="button" className="boton boton-contorno" disabled={ocupado} onClick={revisarVersion}>{t('revisarVersion')}</button>}</div>
      : <p role="status" className="catalogo-estado-limpio"/>}
    <Dialog.Root open={descartarAbierto} onOpenChange={setDescartarAbierto}><Dialog.Portal><Dialog.Overlay className="cambios-panel-fondo"/><MarcoModal className="cambios-panel-modal" etiquetaCerrar={t('cancelar')}><Dialog.Title>{t('descartarTitulo')}</Dialog.Title><Dialog.Description>{u('descartar')}</Dialog.Description><div><Dialog.Close className="boton boton-contorno">{t('cancelar')}</Dialog.Close><button type="button" className="boton catalogo-boton-peligro" onClick={descartarCambios}>{t('descartarConfirmar')}</button></div></MarcoModal></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={revisionAbierta} onOpenChange={abierto => { setRevisionAbierta(abierto); if (!abierto) setConfirmarCarga(false); }}><Dialog.Portal><Dialog.Overlay className="cambios-panel-fondo"/><MarcoModal className="catalogo-revision cambios-panel-modal" etiquetaCerrar={t('seguirEditando')}>
      <Dialog.Title>{t(confirmarCarga ? 'cargarVersionTitulo' : 'revisarVersion')}</Dialog.Title><Dialog.Description>{confirmarCarga ? u('descartar') : t('revisionAyuda')}</Dialog.Description>
      {!confirmarCarga&&versionReciente&&editorId&&<dl><dt>{t('existenciasManuales')}</dt><dd>{t('versionGuardada')}: {versionReciente.catalogo.productos.find(p=>p.id===editorId)?.stockManual??'—'}</dd><dd>{t('suEdicion')}: {datos.productos.find(p=>p.id===editorId)?.stockManual??'—'}</dd></dl>}
      <div>{confirmarCarga ? <><button type="button" className="boton boton-contorno" onClick={() => setConfirmarCarga(false)}>{t('cancelar')}</button><button type="button" className="boton catalogo-boton-peligro" onClick={cargarVersionReciente}>{t('cargarVersion')}</button></> : <><Dialog.Close className="boton boton-contorno">{t('seguirEditando')}</Dialog.Close><button type="button" className="boton boton-azul" onClick={() => setConfirmarCarga(true)}>{t('cargarVersion')}</button></>}</div>
    </MarcoModal></Dialog.Portal></Dialog.Root>
    {estado==='guardado'&&!pendientes&&editorId&&<p className="admin-publicacion-nota" aria-live="polite">{!guardadoAbierto?.publicado ? t('guardadoBorrador') : !motivosGuardado?.length ? t('guardadoPublicado') : motivosGuardado.length === 1 && motivosGuardado[0] === 'sinExistencias' ? t('guardadoSinExistencias') : t('guardadoOculto', { motivos: motivosGuardado.map(x => t(`motivos.${x}`)).join(' · ') })}</p>}
  </div>;
}
