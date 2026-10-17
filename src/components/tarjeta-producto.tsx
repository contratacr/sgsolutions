'use client';
import Link from 'next/link';
import {nombreMarca} from '@/lib/marcas-nombres';
import {useLocale,useTranslations} from 'next-intl';
import {traducir,type CatalogoPublico} from '@/lib/catalogo-modelo';
import {rutaProducto} from '@/lib/rutas-productos';
import {FotoProducto} from './foto-producto';
import {PrecioProducto,EtiquetaDescuento} from './precio-producto';
import {AccionesProducto} from './acciones-producto';
export function TarjetaProducto({producto:p,favorito,cambiarFavorito,listo,bloqueado=false,categoria=''}:{producto:CatalogoPublico['productos'][number];favorito:boolean;cambiarFavorito:()=>void;listo:boolean;bloqueado?:boolean;categoria?:string}){
 const idioma=useLocale(),s=useTranslations('Comercio'),t=useTranslations('Tienda'),a=useTranslations('Asesoria');
 return <article className="shop-producto"><div className="shop-foto">{/* Las URLs de proveedor se muestran directamente: no se importan credenciales ni se descargan imágenes de terceros. */}
  <EtiquetaDescuento producto={p}/><Link href={rutaProducto(p)}><FotoProducto src={p.imagen} alt={traducir(p.nombre,idioma)}/></Link><AccionesProducto producto={p} favorito={favorito} cambiarFavorito={cambiarFavorito} listo={listo} bloqueado={bloqueado}/></div><div className="shop-producto-info"><span className="shop-marca">{p.marca?nombreMarca(p.marca):categoria}</span><h3><Link href={rutaProducto(p)}>{traducir(p.nombre,idioma).split(' - ').slice(0,3).join(' · ')}</Link></h3><small className="shop-codigo">{p.codigoFabricante&&<>{s('codigoFabricante')} {p.codigoFabricante}</>}</small>{p.disponibilidad==='agotado'&&<small>{t('agotado')}</small>}<div className="shop-precio"><PrecioProducto producto={p} pendiente={t('precioPendiente')}/><small>{p.precio===null?s('consultar'):a('precioConIva')}</small></div></div></article>;
}
