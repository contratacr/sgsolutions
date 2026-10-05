'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { colones, esquemaCatalogo, traducir, type CatalogoAdmin, type Texto } from '@/lib/catalogo-modelo';
import { useCambiosAdmin } from '@/components/use-cambios-admin';
import { GestorImagenes } from '@/components/gestor-imagenes';
import { guardarCatalogo } from '@/app/panel/catalogo/acciones';
import { ErroresAdmin, enfocarRegistro, type CampoAdmin } from '@/components/errores-admin';

type Producto = CatalogoAdmin['productos'][number];
const POR_PAGINA = 20;

function Bilingue({ titulo, valor, cambiar, multilinea = false }: { titulo: string; valor: Texto; cambiar: (v: Texto) => void; multilinea?: boolean }) {
  const t = useTranslations('AdminUX');
  return <div className="admin-bilingue">
    {(['es', 'en'] as const).map(lengua => <label key={lengua}>{titulo} ({t(lengua === 'es' ? 'idiomaEs' : 'idiomaEn')}){multilinea
      ? <textarea required maxLength={2000} rows={3} value={valor[lengua]} onChange={e => cambiar({ ...valor, [lengua]: e.target.value })} />
      : <input required maxLength={250} value={valor[lengua]} onChange={e => cambiar({ ...valor, [lengua]: e.target.value })} />}</label>)}
  </div>;
}

function EditorProducto({ p, i, datos, idioma, cambiar, eliminar, cerrar, onBusy }: {
  p: Producto;
  i: number;
  datos: CatalogoAdmin;
  idioma: string;
  cambiar: (indice: number, cambios: Partial<Producto>) => void;
  eliminar: (indice: number) => void;
  cerrar: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const t = useTranslations('AdminCatalogo');
  const u = useTranslations('AdminUX');
  const precio = p.precioManual;
  const seccion = (nombre: string) => `${p.id}-${nombre}`;
  return <section className="admin-producto-editor" id={p.id} aria-label={u('editarProducto', { nombre: traducir(p.nombre, idioma) || t('nuevoProducto') })}>
    <div className="admin-editor-cabecera">
      <div className="admin-editor-identidad"><Image src={p.imagen} alt="" width={70} height={70} unoptimized/><div><span className="admin-kicker">{u('edicion')}</span><h2>{traducir(p.nombre, idioma) || t('nuevoProducto')}</h2><p>{p.codigoFabricante || u('sinCodigo')}</p></div></div>
      <div className="admin-editor-cabecera-acciones"><span className="admin-estado-producto">{p.publicado ? t('publicado') : t('borrador')}</span><button type="button" className="boton boton-contorno" onClick={cerrar}>{u('cerrarEditor')}</button></div>
    </div>
    <nav className="admin-editor-indice" aria-label={u('seccionesProducto')}>{[['basico',u('basico')],['precios',u('precios')],['imagenes',u('imagenes')],['especificaciones',u('especificaciones')],['publicacion',u('publicacion')]].map(([id,etiqueta]) => <a key={id} href={`#${seccion(id)}`} onClick={() => { const destino = document.getElementById(seccion(id)); if (destino instanceof HTMLDetailsElement) destino.open = true; }}>{etiqueta}</a>)}</nav>
    <div className="admin-producto-formulario">
    <section className="admin-producto-seccion" id={seccion('basico')}>
      <div className="admin-producto-seccion-cabecera"><span>01</span><div><h3>{u('basico')}</h3><p>{u('basicoAyuda')}</p></div></div>
      <div className="admin-fields">
        <Bilingue titulo={t('nombre')} valor={p.nombre} cambiar={nombre => cambiar(i, { nombre })} />
        <Bilingue titulo={t('descripcionCampo')} valor={p.descripcion} multilinea cambiar={descripcion => cambiar(i, { descripcion })} />
        <label>{t('categoria')}<select value={p.categoria} onChange={e => cambiar(i, { categoria: e.target.value })}>{datos.categorias.map(c => <option key={c.id} value={c.id}>{traducir(c.nombre, idioma)}</option>)}</select></label>
        <label>{t('marca')}<input value={p.marca} maxLength={80} onChange={e => cambiar(i, { marca: e.target.value })} /></label>
      </div>
    </section>
    <section className="admin-producto-seccion" id={seccion('precios')}>
      <div className="admin-producto-seccion-cabecera"><span>02</span><div><h3>{u('precios')}</h3><p>{u('preciosAyuda')}</p></div></div>
      <div className="admin-precio-resumen"><span>{t('precioFinal')}</span><strong>{precio === null ? t('sinPrecio') : colones(precio)}</strong></div>
      <div className="admin-fields">
        <label>{t('precioManual')}<input type="number" step="1" min="1" value={p.precioManual ?? ''} onChange={e => cambiar(i, { precioManual: e.target.value === '' ? null : Number(e.target.value),precioReferencia:null,costoUsd:null,costoCrc:null })} /><small>{t('manualNota')}</small></label>
        <label>{t('disponibilidadManual')}<select value={p.disponibilidadReferencia} onChange={e=>cambiar(i,{disponibilidadReferencia:e.target.value as Producto['disponibilidadReferencia']})}><option value="consultar">{t('disponibilidadConsultar')}</option><option value="proveedor">{t('disponibilidadPedido')}</option><option value="agotado">{t('disponibilidadAgotado')}</option></select></label>
        <label>{t('codigoFabricante')}<input value={p.codigoFabricante} maxLength={100} onChange={e => cambiar(i, { codigoFabricante: e.target.value })} /></label>
      </div>
    </section>
    <section className="admin-producto-seccion" id={seccion('imagenes')}>
      <div className="admin-producto-seccion-cabecera"><span>03</span><div><h3>{u('imagenes')}</h3><p>{u('imagenesAyuda')}</p></div></div>
      <GestorImagenes onBusy={onBusy} fotos={[...new Set([p.imagen, ...p.imagenes])].filter(src => src !== '/imagenes/producto-sin-imagen.svg').map(src => ({ src }))} cambiar={fotos => cambiar(i, { imagen: fotos[0]?.src ?? '/imagenes/producto-sin-imagen.svg', imagenes: fotos.slice(1).map(f => f.src) })} />
      <label>{t('fichaTecnica')}<input type="url" value={p.fichaTecnica ?? ''} onChange={e => cambiar(i, { fichaTecnica: e.target.value || undefined })} /></label>
    </section>
    <details className="admin-producto-seccion admin-editor-seccion" id={seccion('especificaciones')}><summary><span>04</span><strong>{u('especificaciones')} ({p.especificaciones.length})</strong></summary>
      <button className="boton boton-contorno" type="button" onClick={() => cambiar(i, { especificaciones: [...p.especificaciones, { nombre: { es: '', en: '' }, valor: { es: '', en: '' } }] })}>{t('nuevaEspecificacion')}</button>
      {p.especificaciones.map((e, j) => <div className="admin-especificacion" key={j}>
        <Bilingue titulo={t('nombre')} valor={e.nombre} cambiar={nombre => cambiar(i, { especificaciones: p.especificaciones.map((x, k) => k === j ? { ...x, nombre } : x) })} />
        <Bilingue titulo={t('valor')} valor={e.valor} cambiar={valor => cambiar(i, { especificaciones: p.especificaciones.map((x, k) => k === j ? { ...x, valor } : x) })} />
        <button className="boton boton-contorno" type="button" onClick={() => cambiar(i, { especificaciones: p.especificaciones.filter((_, k) => k !== j) })}>{t('quitarEspecificacion')}</button>
      </div>)}
    </details>
    <section className="admin-producto-seccion" id={seccion('publicacion')}>
      <div className="admin-producto-seccion-cabecera"><span>05</span><div><h3>{u('publicacion')}</h3><p>{u('publicacionAyuda')}</p></div></div>
      <label className="admin-check admin-opcion"><input type="checkbox" checked={p.publicado} onChange={e => cambiar(i, { publicado: e.target.checked })} />{t('publicado')}</label>
      <label className="admin-check admin-opcion"><input type="checkbox" checked={p.destacado} onChange={e => cambiar(i, { destacado: e.target.checked })} />{t('destacado')}</label>
    </section>
    <details className="admin-producto-eliminar"><summary>{u('opcionesAvanzadas')}</summary><p>{u('eliminarAyuda')}</p>
      <button className="boton boton-contorno" type="button" onClick={() => { if (window.confirm(u('confirmarEliminar'))) eliminar(i); }}>{t('quitar')}</button>
    </details>
    </div>
  </section>;
}

export function EditorCatalogo({ inicial, revisionInicial }: { inicial: CatalogoAdmin; revisionInicial: number }) {
  const t = useTranslations('AdminCatalogo');
  const u = useTranslations('AdminUX');
  const m = useTranslations('AdminImagenes');
  const idioma = useLocale();
  const router = useRouter();
  const [datos, setDatos] = useState(inicial);
  const [ultimoGuardado, setUltimoGuardado] = useState(inicial);
  const [revision, setRevision] = useState(revisionInicial);
  const [tab, setTab] = useState('productos');
  const [filtroEstado, setFiltroEstado] = useState('publicados');
  const [categoriaFiltro,setCategoriaFiltro]=useState('todos');
  const [buscar, setBuscar] = useState('');
  const [paginaAdmin, setPaginaAdmin] = useState(1);
  const [editorId, setEditorId] = useState<string | null>(null);
  const [estado, setEstado] = useState('');
  const [campos, setCampos] = useState<CampoAdmin[]>([]);
  const [cargandoImagenes, setCargandoImagenes] = useState(false);
  const [ocupado, iniciar] = useTransition();
  const { pendientes, confirmarGuardado } = useCambiosAdmin(datos);
  const listaRef = useRef<HTMLDivElement>(null);

  const seleccion = datos.productos.map((p, i) => ({ p, i })).filter(({ p }) => (filtroEstado === 'todos' || filtroEstado === 'publicados' && p.publicado || filtroEstado === 'borradores' && !p.publicado) && (categoriaFiltro==='todos'||p.categoria===categoriaFiltro)).filter(({ p }) => `${p.nombre.es} ${p.nombre.en} ${p.codigoFabricante} ${p.marca}`.toLocaleLowerCase().includes(buscar.trim().toLocaleLowerCase()));
  const paginasAdmin = Math.max(1, Math.ceil(seleccion.length / POR_PAGINA));
  const paginaVisible = Math.min(paginaAdmin, paginasAdmin);
  const visibles = seleccion.slice((paginaVisible - 1) * POR_PAGINA, paginaVisible * POR_PAGINA);
  const productoAbierto = editorId ? datos.productos.findIndex(p => p.id === editorId) : -1;

  useEffect(() => { if (editorId && tab === 'productos') enfocarRegistro(editorId); }, [editorId, paginaVisible, tab]);

  function cambiarProducto(indice: number, cambios: Partial<Producto>) {
    setDatos(d => ({ ...d, productos: d.productos.map((p, i) => i === indice ? { ...p, ...cambios } : p) }));
    setEstado('');
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

  function agregarProducto() {
    const id = `producto-${crypto.randomUUID().slice(0, 8)}`;
    setDatos(d => ({ ...d, productos: [{ id, categoria: d.categorias[0].id, nombre: { es: '', en: '' }, descripcion: { es: '', en: '' }, imagen: '/imagenes/producto-sin-imagen.svg', marca: '', codigoFabricante: '', costoUsd: null, costoCrc: null, revisionPrecio: false, precioReferencia: null, disponibilidadReferencia: 'consultar', imagenes: [], especificaciones: [], precioManual: null, publicado: false, destacado: false, inventarioPropio: false }, ...d.productos] }));
    setFiltroEstado('todos'); setCategoriaFiltro('todos'); setBuscar(''); setPaginaAdmin(1); setTab('productos'); setEditorId(id); setEstado('');
  }

  function abrirCampo(campo: CampoAdmin) {
    const grupo = String(campo[0]);
    setTab(grupo);
    if (grupo === 'productos') {
      const indice = Number(campo[1]);
      setBuscar(''); setFiltroEstado('todos'); setCategoriaFiltro('todos'); setPaginaAdmin(Math.floor(indice / POR_PAGINA) + 1);
      setEditorId(datos.productos[indice]?.id ?? null);
    } else if (grupo === 'categorias') {
      requestAnimationFrame(() => enfocarRegistro(datos.categorias[Number(campo[1])]?.id));
    } else requestAnimationFrame(() => enfocarRegistro('admin-' + grupo));
  }

  function guardar() {
    const validado = esquemaCatalogo.safeParse(datos);
    if (!validado.success) { setCampos(validado.error.issues.map(x => x.path.map(k => typeof k === 'number' ? k : String(k)))); setEstado('validacion'); return; }
    setCampos([]);
    iniciar(async () => {
      try {
        const respuesta = await guardarCatalogo(validado.data, revision);
        if (respuesta.error) setEstado(respuesta.error);
        else { confirmarGuardado(); setUltimoGuardado(datos); setRevision(respuesta.revision!); setEstado('guardado'); router.refresh(); }
      } catch { setEstado('error'); }
    });
  }

  function paginacion() {
    if (paginasAdmin <= 1) return null;
    return <nav className="admin-paginacion" aria-label={t('paginasProductos')}>
      <button type="button" disabled={paginaVisible === 1} onClick={() => irPagina(paginaVisible - 1)}>{t('anterior')}</button>
      <label>{u('irPagina')}<select value={paginaVisible} onChange={e => irPagina(Number(e.target.value))}>{Array.from({ length: paginasAdmin }, (_, i) => <option key={i} value={i + 1}>{t('pagina', { pagina: i + 1, total: paginasAdmin })}</option>)}</select></label>
      <button type="button" disabled={paginaVisible === paginasAdmin} onClick={() => irPagina(paginaVisible + 1)}>{t('siguiente')}</button>
    </nav>;
  }

  return <div className="admin-editor admin-tienda">
    <p>{t('descripcion')}</p>
    <aside className="admin-guia"><strong>{t('seleccionManual')}</strong><p>{t('seleccionManualAyuda')}</p></aside>
    <div className="admin-tabs" role="group" aria-label={t('titulo')}>{['productos', 'categorias', 'textos'].map(k => <button type="button" aria-pressed={tab === k} onClick={() => { setTab(k); setEditorId(null); }} key={k}>{t(k)}</button>)}</div>
    <fieldset disabled={ocupado || cargandoImagenes} className="admin-tienda-cuerpo">
      {tab === 'productos' && editorId && productoAbierto >= 0 ? <div className="admin-edicion-vista">
        <button type="button" className="admin-volver-lista" onClick={cerrarProducto}>{u('volverLista')}</button>
        <EditorProducto p={datos.productos[productoAbierto]} i={productoAbierto} datos={datos} idioma={idioma} cambiar={cambiarProducto} onBusy={setCargandoImagenes} cerrar={cerrarProducto} eliminar={indice => { setDatos(d => ({ ...d, productos: d.productos.filter((_, j) => indice !== j) })); cerrarProducto(); }} />
      </div> : tab === 'productos' && <>
        <div className="admin-lista-cabecera" ref={listaRef}>
          <div><h2>{t('productos')}</h2><p>{u('resultados', { cantidad: seleccion.length })} · {u('mostrando', { inicio: seleccion.length ? (paginaVisible - 1) * POR_PAGINA + 1 : 0, fin: Math.min(paginaVisible * POR_PAGINA, seleccion.length) })}</p></div>
          <button type="button" className="boton boton-azul" onClick={agregarProducto}>{t('nuevoProducto')}</button>
        </div>
        <div className="admin-lista-filtros">
          <label>{t('categoria')}<select value={categoriaFiltro} onChange={e=>{setCategoriaFiltro(e.target.value);setPaginaAdmin(1);setEditorId(null);}}><option value="todos">{u('todos')}</option>{datos.categorias.map(c=><option key={c.id} value={c.id}>{traducir(c.nombre,idioma)} ({datos.productos.filter(p=>p.categoria===c.id&&(filtroEstado==='todos'||filtroEstado==='publicados'&&p.publicado||filtroEstado==='borradores'&&!p.publicado)).length})</option>)}</select></label>
          <label>{t('buscarProductos')}<input type="search" value={buscar} onChange={e => { setBuscar(e.target.value); setPaginaAdmin(1); setEditorId(null); }} /></label>
          <label>{u('estado')}<select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPaginaAdmin(1); setEditorId(null); }}>{['todos', 'publicados', 'borradores'].map(k => <option key={k} value={k}>{u(k)}</option>)}</select></label>
        </div>
        {seleccion.length ? <>{paginacion()}<div className="admin-productos-lista">{visibles.map(({ p }) => {
          const precio = p.precioManual;
          return <div className="admin-producto-contenedor" key={p.id}><div className="admin-producto-fila">
            <div className="admin-producto-foto"><Image src={p.imagen} alt="" width={64} height={64} unoptimized /></div>
            <div className="admin-producto-datos"><strong>{traducir(p.nombre, idioma) || t('nuevoProducto')}</strong><span>{p.marca || u('sinMarca')} · {p.codigoFabricante || u('sinCodigo')}</span></div>
            <div className="admin-producto-estado"><span>{p.publicado ? t('publicado') : t('borrador')}</span><strong>{precio === null ? t('sinPrecio') : colones(precio)}</strong></div>
            <button type="button" className="boton boton-contorno" onClick={() => abrirProducto(p.id)}>{u('editar')}</button>
          </div></div>;
        })}</div>{paginacion()}</> : <p className="admin-lista-vacia">{u('vacio')}</p>}
      </>}
      {tab === 'categorias' && <><div className="admin-lista-cabecera"><div><h2>{t('categorias')}</h2><p>{u('categoriasAyuda')}</p></div><button type="button" className="boton boton-azul" onClick={() => { const id = `categoria-${crypto.randomUUID().slice(0, 8)}`; setDatos(d => ({ ...d, categorias: [{ id, nombre: { es: '', en: '' } }, ...d.categorias] })); setEstado(''); requestAnimationFrame(() => enfocarRegistro(id)); }}>{t('nuevaCategoria')}</button></div>{datos.categorias.map((c, i) => <div className="admin-item" key={c.id} id={c.id}><div className="admin-fields"><Bilingue titulo={t('nombre')} valor={c.nombre} cambiar={nombre => setDatos(d => ({ ...d, categorias: d.categorias.map((x, j) => j === i ? { ...x, nombre } : x) }))} /></div><button type="button" className="boton boton-contorno" disabled={datos.categorias.length === 1 || datos.productos.some(p => p.categoria === c.id)} onClick={() => setDatos(d => ({ ...d, categorias: d.categorias.filter((_, j) => j !== i) }))}>{t('quitar')}</button><p>{t('categoriaNota')}</p></div>)}</>}
      {tab === 'textos' && <section className="admin-configuracion"><h2>{t('textos')}</h2><p>{u('textosAyuda')}</p><div id="admin-textos" className="admin-fields">{(['titulo', 'descripcion', 'aviso'] as const).map(k => <Bilingue key={k} titulo={t(k === 'titulo' ? 'tituloTienda' : k === 'descripcion' ? 'descripcionCampo' : 'aviso')} valor={datos.textos[k]} multilinea={k !== 'titulo'} cambiar={valor => setDatos(d => ({ ...d, textos: { ...d.textos, [k]: valor } }))} />)}</div></section>}
    </fieldset>
    <ErroresAdmin campos={campos} abrir={abrirCampo} />
    <div className="admin-actions"><button type="button" className="boton boton-azul" disabled={ocupado || cargandoImagenes} onClick={guardar}>{t(ocupado ? 'guardando' : 'guardar')}</button><button type="button" className="boton boton-contorno" disabled={ocupado || cargandoImagenes} onClick={() => { if (window.confirm(u('descartar'))) { setDatos(ultimoGuardado); setCampos([]); setEstado(''); setEditorId(null); } }}>{t('restablecer')}</button><span role="status">{estado && estado !== 'guardado' ? t(estado) : pendientes ? m('pendientes') : estado ? t(estado) : t('notaGuardar')}</span></div>
  </div>;
}
