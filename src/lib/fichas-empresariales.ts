import fichas from './fichas-empresariales.json';
import {nombreMarca} from './marcas-nombres';
import type {CatalogoAdmin} from './catalogo-modelo';
type Producto=CatalogoAdmin['productos'][number];
type Ficha={sku:string;mpn:string;marca:string;nombre:Producto['nombre'];descripcion:Producto['descripcion'];especificaciones:Producto['especificaciones']};
const registro=new Map((fichas as Ficha[]).map(f=>[f.sku,f]));
const normalizar=(s:string)=>s.toUpperCase().replace(/\s+/g,'');
/** Exact supplier identity only. Prices, visibility, images and sale rules stay with the catalog. */
export function completarFichaEmpresarial<T extends Producto>(p:T):T{
 const f=registro.get(p.codigoIntcomex??'');
 if(!f||normalizar(f.mpn)!==normalizar(p.codigoFabricante)||nombreMarca(f.marca)!==nombreMarca(p.marca))return p;
 return {...p,nombre:f.nombre,descripcion:f.descripcion,especificaciones:f.especificaciones};
}
