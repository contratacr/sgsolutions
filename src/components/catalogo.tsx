'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Plus, Check, Search, X, Grid2X2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { productos } from '@/lib/productos';
import { agregarProducto, useCarrito } from '@/lib/carrito';

const categorias = [
  {id:'todos', imagen:null},
  {id:'computo', imagen:'portatil'},
  {id:'seguridad', imagen:'camaras'},
  {id:'redes', imagen:'red'},
  {id:'negocio', imagen:'pos'}
];
function normalizar(texto: string) { return texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim(); }
export function Catalogo() {
  const t = useTranslations('Tienda');
  const [categoria, setCategoria] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const lineas = useCarrito();
  const consulta = normalizar(busqueda);
  const visibles = productos.filter(p => (categoria === 'todos' || p.categoria === categoria) && normalizar(`${t(`${p.id}Nombre`)} ${t(`${p.id}Texto`)} ${t(p.categoria)}`).includes(consulta));
  return <>
    <div className="categorias-visuales" role="group" aria-label={t('filtro')}>{categorias.map(({id,imagen}) => <button key={id} aria-pressed={categoria===id} onClick={() => setCategoria(id)}><span className="categoria-miniatura">{imagen ? <Image src={`/imagenes/${imagen}.webp`} alt="" fill sizes="80px"/> : <Grid2X2 size={27} strokeWidth={1.3}/>}</span><span>{t(id)}</span></button>)}</div>
    <div className="catalogo-herramientas"><p className="conteo" aria-live="polite" aria-atomic="true">{t('resultados', {cantidad: visibles.length})}</p><div className="busqueda-equipo"><Search size={18}/><label className="sr-only" htmlFor="buscar-equipo">{t('buscar')}</label><input id="buscar-equipo" type="search" placeholder={t('buscar')} value={busqueda} onChange={evento => setBusqueda(evento.target.value)} maxLength={150}/>{busqueda && <button type="button" onClick={() => setBusqueda('')} aria-label={t('limpiarBusqueda')}><X size={16}/></button>}</div></div>
    {visibles.length === 0 ? <div className="catalogo-vacio"><Search size={30} strokeWidth={1.25}/><h3>{t('sinResultados')}</h3><p>{t('intentarBusqueda')}</p><button className="boton boton-contorno" onClick={() => {setBusqueda('');setCategoria('todos');}}>{t('restablecer')}</button></div> : <div className="catalogo-grid">{visibles.map(p => {
      const agregado = lineas.some(l => l.id === p.id);
      return <article className="producto" key={p.id}><div className="producto-imagen"><Image src={p.imagen} alt={t(`${p.id}Alt`)} fill sizes="(max-width: 620px) 100vw, (max-width: 1000px) 50vw, 33vw" style={{objectPosition: p.posicion}}/><span className="producto-etiqueta">{t(p.categoria)}</span></div><div className="producto-cuerpo"><h3>{t(`${p.id}Nombre`)}</h3><p>{t(`${p.id}Texto`)}</p><div className="producto-compra"><strong className="producto-precio">{t('precioPendiente')}</strong><button className="boton boton-contorno" onClick={() => agregarProducto(p.id)}>{agregado ? t('agregado') : t('agregar')}{agregado ? <Check size={18}/> : <Plus size={18}/>}</button></div></div></article>;
    })}</div>}
  </>;
}
