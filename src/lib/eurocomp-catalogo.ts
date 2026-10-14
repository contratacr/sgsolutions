import {esProductoEurocomp} from './catalogo-fuente';
import {subcategoriaEurocomp} from './eurocomp-subcategorias';
import {createHash} from 'node:crypto';
import type {CatalogoAdmin} from './catalogo-modelo';
import type {CatalogoEurocomp} from './eurocomp-protocolo';
import {categoriaEurocomp,categoriasEurocomp,precioVentaEurocomp,stockVendibleEurocomp} from './eurocomp-politica';
/** Supplier stock refresh preserves existing editorial fields and publication choices. */
export function reconciliarEurocomp(base:CatalogoAdmin,copia:CatalogoEurocomp):CatalogoAdmin{
 const anteriores=new Map(base.productos.filter(esProductoEurocomp).map(p=>[p.eurocomp?.codigo??p.codigoEurocomp!,p]));
 const recibidos=new Set(copia.articulos.map(a=>a.codigo));
 const productos:CatalogoAdmin['productos']=[];
 for(const a of copia.articulos){
  const categoria=categoriaEurocomp(a),anterior=anteriores.get(a.codigo);
  if(!categoria||a.precio===null||a.precio<=0||!['USD','CRC'].includes(a.moneda))continue;
  if(!anterior&&!stockVendibleEurocomp(a.stock))continue;
  const cat=categoriasEurocomp.find(c=>c.id===categoria)!;
  const imagen=a.imagen||'/imagenes/producto-sin-imagen.svg';
  const nuevo={id:'eurocomp-'+createHash('sha256').update(a.codigo).digest('hex').slice(0,16),categoria,nombre:{es:a.nombre,en:`${a.marca||'Eurocomp'} ${cat.nombre.en} — ${a.parte||a.codigo}`},descripcion:{es:`${cat.nombre.es} de ${a.marca||'Eurocomp'}. Código de fabricante: ${a.parte||a.codigo}.`,en:`${cat.nombre.en} by ${a.marca||'Eurocomp'}. Manufacturer code: ${a.parte||a.codigo}.`},imagen,imagenes:[],especificaciones:[],marca:a.marca,codigoFabricante:a.parte||a.codigo,inventarioPropio:false,costoUsd:null,costoCrc:null,precioReferencia:null,disponibilidadReferencia:'proveedor' as const,revisionPrecio:false,precioManual:null,publicado:Boolean(a.imagen && subcategoriaEurocomp(a.familia)),destacado:false};
  productos.push({...nuevo,...anterior,subcategoria:anterior?.subcategoria ?? subcategoriaEurocomp(a.familia),codigoEurocomp:a.codigo,precioManual:precioVentaEurocomp(a.precio,a.moneda,base.ajustes.cambio,base.ajustes.utilidad,base.ajustes.iva,base.ajustes.adicional),eurocomp:{codigo:a.codigo,stock:a.stock??0,costo:a.precio,moneda:a.moneda as 'USD'|'CRC',actualizado:copia.fecha}});
 }
 for(const [codigo,p]of anteriores)if(!recibidos.has(codigo))productos.push({...p,eurocomp:{codigo,stock:0,costo:p.eurocomp?.costo??0,moneda:p.eurocomp?.moneda??'USD',actualizado:copia.fecha}});
 const ids=new Set(categoriasEurocomp.map(c=>c.id));
 const usadas=new Set(productos.map(p=>p.categoria));
 const categorias=[...categoriasEurocomp,...base.categorias.filter(c=>!ids.has(c.id)&&usadas.has(c.id))];
 const siguiente={...base,gestion:'manual' as const,categorias,productos:productos.map(p=>{const limpio={...p};delete limpio.codigoIntcomex;delete limpio.estadoIntcomex;delete limpio.proveedor;return limpio;})};
 delete siguiente.sincronizacion;delete siguiente.inventario;
 return siguiente;
}
