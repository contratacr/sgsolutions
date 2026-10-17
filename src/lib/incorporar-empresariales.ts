import {completarFichaEmpresarial} from './fichas-empresariales.ts';
import {resolverImagenProducto} from './imagenes-productos';
import productos from './catalogo-empresarial.json';
import {esquemaCatalogo,type CatalogoAdmin} from './catalogo-modelo';

/** The curated import is independent from Eurocomp synchronization and snapshots. */
export function incorporarEmpresariales(c:CatalogoAdmin):CatalogoAdmin{
 const ids=new Set(c.productos.map(p=>p.id));
 const completo=esquemaCatalogo.parse({...c,productos:[...c.productos,...productos.filter((p:{id:string})=>!ids.has(p.id))]});
 return {...completo,productos:completo.productos.map(completarFichaEmpresarial).map(resolverImagenProducto)};
}
