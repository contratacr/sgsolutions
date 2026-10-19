/** Closed, explicitly reviewed digital SKU; never accepts arbitrary supplier items. */
export const SOFTWARE_ID='software-intcomex-se027mse92';
export function esProductoSoftware(p:{id:string;categoria?:string;marca?:string;codigoFabricante?:string}){
 return p.id===SOFTWARE_ID&&p.categoria==='software'&&p.marca?.toUpperCase()==='MICROSOFT'&&p.codigoFabricante==='EP2-32316';
}
export function limiteCantidadProducto(id:string){return id===SOFTWARE_ID?30:99;}
export function compraSoloDigital(articulos:readonly {producto:{id:string;categoria?:string;marca?:string;codigoFabricante?:string}}[]){return articulos.length>0&&articulos.every(a=>esProductoSoftware(a.producto));}
export function modalidadCompraValida(articulos:Parameters<typeof compraSoloDigital>[0],modalidad:string){return compraSoloDigital(articulos)?modalidad==='digital':modalidad!=='digital';}
