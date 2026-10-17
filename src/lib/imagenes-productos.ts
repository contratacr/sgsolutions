import verificadas from './imagenes-productos-verificadas.json';
import invalidas from './imagenes-productos-invalidas.json';

const rechazadas=new Set(invalidas);
const registro=new Map(verificadas.map(f=>[f.id,f]));
type ProductoConFoto={id:string;marca:string;codigoFabricante:string;imagen:string;imagenes:string[]};
const normalizar=(valor:string)=>valor.trim().toUpperCase();

export function imagenProductoUtilizable(url:string){
 return Boolean(url)&&!url.includes('producto-sin-imagen')&&!rechazadas.has(url);
}

// Only replace the audited source for the same manufacturer and part number.
// A later editorial upload always takes precedence over this repair registry.
export function resolverImagenProducto<T extends ProductoConFoto>(producto:T):T{
 const f=registro.get(producto.id);
 const coincide=f&&normalizar(f.marca)===normalizar(producto.marca)&&normalizar(f.mpn)===normalizar(producto.codigoFabricante);
 const imagen=coincide&&(f.sustituye.includes(producto.imagen)||producto.imagen===f.imagen)?f.imagen:producto.imagen;
 const fotos=[...new Set([imagen,...producto.imagenes])].filter(imagenProductoUtilizable);
 return {...producto,imagen:fotos[0]??'/imagenes/producto-sin-imagen.svg',imagenes:fotos.slice(1)};
}
export function tieneImagenProducto(producto:ProductoConFoto){
 return imagenProductoUtilizable(resolverImagenProducto(producto).imagen);
}
