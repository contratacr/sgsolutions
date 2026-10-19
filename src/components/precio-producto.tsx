import {useTranslations} from 'next-intl';
import {colones} from '@/lib/catalogo-modelo';
export function PrecioProducto({producto,pendiente}:{producto:{precio:number|null;precioOriginal?:number|null;entregaDigital?:boolean};pendiente?:string}){
 const t=useTranslations('Comercio');
 const oferta=producto.precio!==null&&producto.precioOriginal!=null&&producto.precioOriginal>producto.precio;
 return <span className={`precio-producto${oferta?' precio-producto-oferta':''}`}>
 {oferta&&<del><span className="sr-only">{t('precioAntes')}: </span>{colones(producto.precioOriginal!)}</del>}
 <strong>{oferta&&<span className="sr-only">{t('precioOferta')}: </span>}{producto.precio===null?pendiente:colones(producto.precio)}</strong>
 {producto.entregaDigital&&<small className="producto-bajo-pedido">{t('bajoPedidoDigital')}</small>}
 </span>;
}

export function EtiquetaDescuento({producto}:{producto:{precio:number|null;precioOriginal?:number|null}}){
 const t=useTranslations('Comercio');
 if(producto.precio===null||producto.precioOriginal==null||producto.precioOriginal<=producto.precio||producto.precio<0)return null;
 const porcentaje=Math.floor((1-producto.precio/producto.precioOriginal)*100);
 const texto=porcentaje>0?`−${porcentaje}%`:'−<1%';
 return <span className="producto-descuento"><span aria-hidden="true">{texto}</span><span className="sr-only">{t('descuentoPorcentaje',{porcentaje:porcentaje>0?String(porcentaje):'<1'})}</span></span>;
}
