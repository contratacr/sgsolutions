'use client';
import {FilaProductos} from './fila-productos';
import {PrecioProducto,EtiquetaDescuento} from './precio-producto';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useLocale,useTranslations} from 'next-intl';
import {AccionesProducto} from './acciones-producto';
import {useFavoritos} from '@/lib/favoritos';
import {recomendaciones} from '@/lib/recomendaciones';
import {leerHistorial,recordarExploracion} from '@/lib/historial-tienda';
import {rutaProducto} from '@/lib/rutas-productos';
import {traducir} from '@/lib/catalogo-modelo';
import {FotoProducto} from './foto-producto';
import './recomendaciones-tienda.css';
type Datos=ReturnType<typeof recomendaciones>;
export function RecomendacionesTienda({inicial,actual,oculto=false}:{inicial?:Datos;actual?:string;oculto?:boolean}){
 const t=useTranslations('Recomendaciones'),a=useTranslations('Asesoria'),idioma=useLocale(),favoritos=useFavoritos();
 const [datos,setDatos]=useState<Datos|undefined>(inicial),[historial,setHistorial]=useState({activo:false,ids:[] as string[],vistas:[] as string[]});
 useEffect(()=>{const leer=()=>setHistorial(leerHistorial());leer();window.addEventListener('sg-historial',leer);window.addEventListener('storage',leer);return()=>{window.removeEventListener('sg-historial',leer);window.removeEventListener('storage',leer);};},[]);
 useEffect(()=>{if(actual)recordarExploracion([actual],true);},[actual,historial.activo]);
 const ids=historial.ids.join(','),vistas=historial.vistas.join(',');
 useEffect(()=>{if(!actual&&!historial.activo&&inicial)return;const abort=new AbortController();const p=new URLSearchParams();if(ids)p.set('explorados',ids);if(vistas)p.set('vistos',vistas);if(actual)p.set('actual',actual);fetch('/api/recomendaciones?'+p,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(setDatos).catch(()=>{});return()=>abort.abort();},[ids,vistas,actual,historial.activo,inicial]);
 function fila(titulo:string,productos:Datos['destacados']){if(!productos.length)return null;return <FilaProductos titulo={titulo}>{productos.map(p=><article className="shop-producto" key={p.id}><div className="shop-foto"><EtiquetaDescuento producto={p}/><Link href={rutaProducto(p)}><FotoProducto src={p.imagen} alt={traducir(p.nombre,idioma)}/></Link><AccionesProducto producto={p} favorito={favoritos.ids.includes(p.id)} cambiarFavorito={()=>favoritos.cambiar(p.id)} listo={favoritos.listo}/></div><div className="shop-producto-info"><span className="shop-marca">{p.marca}</span><h3><Link href={rutaProducto(p)}>{traducir(p.nombre,idioma)}</Link></h3><div className="shop-precio"><PrecioProducto producto={p}/><small>{a('precioConIva')}</small></div></div></article>)}</FilaProductos>;}
 return <div className="recomendaciones" hidden={oculto}>
 {datos&&(actual?fila(t('similares'),datos.sugeridos):<>{fila(datos.destacados.length?t('destacados'):t('descubrir'),datos.destacados.length?datos.destacados:datos.descubrir)}{historial.activo&&<>{fila(t('paraUsted'),datos.sugeridos)}{fila(t('recientes'),datos.recientes)}</>}</>)}
 </div>;
}
