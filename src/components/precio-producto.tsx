import {useTranslations} from 'next-intl';
import {colones} from '@/lib/catalogo-modelo';
export function PrecioProducto({producto,pendiente}:{producto:{precio:number|null;precioOriginal?:number|null};pendiente?:string}){
 const t=useTranslations('Comercio');
 const oferta=producto.precio!==null&&producto.precioOriginal!=null&&producto.precioOriginal>producto.precio;
 return <span className={`precio-producto${oferta?' precio-producto-oferta':''}`}>
 {oferta&&<del><span className="sr-only">{t('precioAntes')}: </span>{colones(producto.precioOriginal!)}</del>}
 <strong>{oferta&&<span className="sr-only">{t('precioOferta')}: </span>}{producto.precio===null?pendiente:colones(producto.precio)}</strong>
 </span>;
}
