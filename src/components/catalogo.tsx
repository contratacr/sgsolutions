'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Plus, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { productos } from '@/lib/productos';
import { agregarProducto, useCarrito } from '@/lib/carrito';

export function Catalogo() {
  const t = useTranslations('Tienda');
  const [categoria, setCategoria] = useState('todos');
  const lineas = useCarrito();
  const visibles = productos.filter(p => categoria === 'todos' || p.categoria === categoria);
  return <><div className="filtros" role="group" aria-label={t('filtro')}>{['todos','computo','seguridad','redes','negocio'].map(valor => <button key={valor} aria-pressed={categoria===valor} onClick={() => setCategoria(valor)}>{t(valor)}</button>)}</div><p className="conteo" aria-live="polite">{t('resultados', {cantidad: visibles.length})}</p><div className="catalogo-grid">{visibles.map(p => {
    const agregado = lineas.some(l => l.id === p.id);
    return <article className="producto" key={p.id}><div className="producto-imagen"><Image src={p.imagen} alt={t(`${p.id}Alt`)} fill sizes="(max-width: 620px) 100vw, (max-width: 1000px) 50vw, 33vw" style={{objectPosition: p.posicion}}/></div><div className="producto-cuerpo"><span className="producto-categoria">{t(p.categoria)}</span><h2>{t(`${p.id}Nombre`)}</h2><p>{t(`${p.id}Texto`)}</p><strong className="producto-precio">{t('precioPendiente')}</strong><button className="boton boton-contorno" onClick={() => agregarProducto(p.id)}>{agregado ? t('agregado') : t('agregar')}{agregado ? <Check size={18}/> : <Plus size={18}/>}</button></div></article>;
  })}</div></>;
}
