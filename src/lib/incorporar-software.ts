import productos from './catalogo-software.json';
import {esquemaCatalogo,type CatalogoAdmin,type CatalogoPublico,publicarCatalogo} from './catalogo-modelo';
import {esProductoSoftware} from './software';
const categoria={id:'software',nombre:{es:'Software',en:'Software'}};
export function incorporarSoftware(c:CatalogoAdmin):CatalogoAdmin{
 return esquemaCatalogo.parse({...c,categorias:c.categorias.some(x=>x.id==='software')?c.categorias:[...c.categorias,categoria],productos:[...c.productos,...productos.filter(p=>!c.productos.some(x=>x.id===p.id))]});
}
/** A published version marker preserves explicit administrator unpublishing. */
export function completarSoftwarePublico(c:CatalogoPublico,base:CatalogoAdmin):CatalogoPublico{
 if(c.versionSoftware===1)return c;
 const software=publicarCatalogo(incorporarSoftware(base)).productos.filter(esProductoSoftware);
 return {...c,versionSoftware:1,categorias:c.categorias.some(x=>x.id==='software')?c.categorias:[...c.categorias,categoria],productos:[...c.productos,...software.filter(p=>!c.productos.some(x=>x.id===p.id))]};
}
