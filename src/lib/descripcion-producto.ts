import {traducir,type Texto} from './catalogo-modelo';
export function descripcionUtil(producto:{descripcion:Texto;nombre:Texto},idioma:string){
 const texto=traducir(producto.descripcion,idioma).trim();
 if(texto===traducir(producto.nombre,idioma).trim()||/^[^.]+(?: de | by )[^.]+\. (?:Código de fabricante|Manufacturer code): [^.]+\.$/.test(texto))return '';
 return texto;
}
