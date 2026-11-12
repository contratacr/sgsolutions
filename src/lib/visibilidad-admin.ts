import {esProductoSoftware} from './software';
import {tieneImagenProducto} from './imagenes-productos';
import {esProductoManual,esProductoEurocomp,esProductoEmpresarial,esDuplicadoEmpresarial} from './catalogo-fuente';
import {preciosProducto,type CatalogoAdmin} from './catalogo-modelo';
import {cumpleMinimoVenta} from './politica-visibilidad-productos';

type Producto=CatalogoAdmin['productos'][number];
export type MotivoOculto='borrador'|'origen'|'sinImagen'|'duplicadoEmpresarial'|'existenciasEurocomp'|'sinExistencias'|'minimoVenta';
export const MOTIVOS_OCULTO:MotivoOculto[]=['borrador','origen','sinImagen','duplicadoEmpresarial','existenciasEurocomp','sinExistencias','minimoVenta'];
export type OrigenProducto='manual'|'eurocomp'|'empresarial'|'software'|'otro';
/** Same Eurocomp threshold as publicarCatalogo (catalogo-modelo.ts). */
export const EXISTENCIAS_MINIMAS_EUROCOMP=15;

export function origenProducto(p:Producto):OrigenProducto{
 return esProductoManual(p)?'manual':esProductoEurocomp(p)?'eurocomp':esProductoEmpresarial(p)?'empresarial':esProductoSoftware(p)?'software':'otro';
}

/**
 * Read-only diagnosis for administrators. Mirrors, without changing, the public
 * projection: publicarCatalogo (image, eligible origin, business duplicate,
 * published flag, Eurocomp stock) and leerCatalogoPublico (sale minimum with the
 * offer valid now, manual stock 0). An empty list means visible in the store.
 */
export function motivosOcultoPublico(p:Producto,ajustes:CatalogoAdmin['ajustes'],ahora=Date.now()):MotivoOculto[]{
 const motivos:MotivoOculto[]=[];
 if(!p.publicado)motivos.push('borrador');
 if(origenProducto(p)==='otro')motivos.push('origen');
 if(!tieneImagenProducto(p))motivos.push('sinImagen');
 if(esDuplicadoEmpresarial(p))motivos.push('duplicadoEmpresarial');
 if(p.eurocomp&&p.eurocomp.stock<EXISTENCIAS_MINIMAS_EUROCOMP)motivos.push('existenciasEurocomp');
 if(esProductoManual(p)&&p.stockManual===0)motivos.push('sinExistencias');
 if(!cumpleMinimoVenta({categoria:p.categoria,subcategoria:p.subcategoria,nombre:p.nombre,precio:preciosProducto(p,ajustes,ahora).precio}))motivos.push('minimoVenta');
 return motivos;
}

/** Same availability the public projection reports as "agotado". */
export function productoAgotado(p:Producto){
 if(esProductoManual(p)&&p.stockManual!=null)return p.stockManual===0;
 return p.eurocomp?.stock===0||p.disponibilidadReferencia==='agotado';
}

export function productoEnOferta(p:Producto,ajustes:CatalogoAdmin['ajustes'],ahora=Date.now()){
 return preciosProducto(p,ajustes,ahora).precioOriginal!==null;
}
