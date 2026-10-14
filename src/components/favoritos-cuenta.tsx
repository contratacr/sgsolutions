'use client';
import {useFavoritos} from '@/lib/favoritos';
import {useCatalogo} from './datos-catalogo';
import {FotoProducto} from './foto-producto';
import {PrecioProducto,EtiquetaDescuento} from './precio-producto';
import {AccionesProducto} from './acciones-producto';
import {useLocale,useTranslations} from 'next-intl';
import {traducir} from '@/lib/catalogo-modelo';
import {rutaProducto} from '@/lib/rutas-productos';
import Link from 'next/link';
import {useEffect} from 'react';
export function FavoritosCuenta(){const favoritos=useFavoritos(),catalogo=useCatalogo(),idioma=useLocale(),t=useTranslations('AccionesProducto');const ids=favoritos.ids.join(',');const recordar=catalogo.recordar;useEffect(()=>{if(!ids)return;const abort=new AbortController();Promise.all(Array.from({length:Math.ceil(ids.split(',').length/30)},(_,i)=>fetch('/api/catalogo?ids='+encodeURIComponent(ids.split(',').slice(i*30,(i+1)*30).join(',')),{signal:abort.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}))).then(datos=>recordar(datos.flatMap(d=>d.productos))).catch(()=>{});return()=>abort.abort();},[ids,recordar]);const productos=catalogo.productos.filter(p=>favoritos.ids.includes(p.id));return <section><h2>{t('favoritos')}</h2>{favoritos.error&&<p role="status">{t('sinSincronizar')}</p>}{!favoritos.listo?<p>{t('cargando')}</p>:productos.length===0?<p>{t('sinFavoritos')}</p>:<div className="shop-grid favoritos-grid">{productos.map(p=><article className="shop-producto" key={p.id}><div className="shop-foto"><EtiquetaDescuento producto={p}/><Link href={rutaProducto(p)}><FotoProducto src={p.imagen} alt={traducir(p.nombre,idioma)}/></Link><AccionesProducto producto={p} favorito cambiarFavorito={()=>favoritos.cambiar(p.id)} listo={favoritos.listo}/></div><h3><Link href={rutaProducto(p)}>{traducir(p.nombre,idioma)}</Link></h3><PrecioProducto producto={p}/></article>)}</div>}<Link href="/tienda">{t('verTienda')}</Link></section>;}
