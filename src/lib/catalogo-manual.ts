import {calcularPrecio, publicarCatalogo, type CatalogoAdmin, type CatalogoPublico} from './catalogo-modelo';

const textos={
 titulo:{es:'SG Solutions',en:'SG Solutions'},
 descripcion:{es:'Tecnología que funciona para usted. Le ayudamos a elegir equipos compatibles y la solución adecuada para su hogar o negocio.',en:'Technology that works for you. We help you choose compatible equipment and the right solution for your home or business.'},
 aviso:{es:'Precios de referencia con IVA incluido. Su carrito no reserva productos ni genera un cobro.',en:'Reference prices include VAT. Your cart does not reserve products or create a charge.'}
};

// One-time adaptation of legacy data. Once saved as manual, the administrator
// controls publication and category counts without an ongoing automatic limit.
export function seleccionarIniciales(productos:CatalogoPublico['productos']){
 const conteos=new Map<string,number>();
 return [...productos].sort((a,b)=>Number(b.disponibilidad!=='agotado')-Number(a.disponibilidad!=='agotado')||Number(b.precio!==null)-Number(a.precio!==null)||Number(b.destacado)-Number(a.destacado)).filter(p=>{
  const cantidad=conteos.get(p.categoria)??0;
  if(cantidad>=5)return false;
  conteos.set(p.categoria,cantidad+1);return true;
 });
}
export function catalogoPublicoManual(c:CatalogoPublico):CatalogoPublico{
 if(c.gestion==='manual')return actualizarPromesa(c);
 return {...c,gestion:'manual',textos,productos:seleccionarIniciales(c.productos).map(p=>({...p,disponibilidad:'consultar',actualizado:null}))};
}
export function migrarCatalogoManual(c:CatalogoAdmin):CatalogoAdmin{
 if(c.gestion==='manual')return actualizarPromesa(c);
 const elegidos=new Set(seleccionarIniciales(publicarCatalogo(c).productos).map(p=>p.id));
 const siguiente=structuredClone(c);
 siguiente.gestion='manual';siguiente.textos=structuredClone(textos);
 delete siguiente.sincronizacion;delete siguiente.inventario;
 siguiente.productos=siguiente.productos.map(p=>{
  const precio=p.revisionPrecio&&p.precioManual===null?null:calcularPrecio(p.costoUsd,c.ajustes,p.precioManual,p.costoCrc)??p.precioReferencia;
  delete p.proveedor;delete p.codigoIntcomex;delete p.estadoIntcomex;
  return {...p,publicado:elegidos.has(p.id),precioManual:precio,precioReferencia:null,costoUsd:null,costoCrc:null,revisionPrecio:false,inventarioPropio:false,disponibilidadReferencia:'consultar'};
 });
 return siguiente;
}

function actualizarPromesa<T extends CatalogoAdmin|CatalogoPublico>(c:T):T{
 const anteriores={es:'Compra tecnología. Obtén asesoría. Nosotros nos encargamos del resto.',en:'Buy technology. Get advice. We take care of the rest.'};
 const descripcion={...c.textos.descripcion};
 for(const l of ['es','en'] as const)if(descripcion[l]===anteriores[l])descripcion[l]=textos.descripcion[l];
 return {...c,textos:{...c.textos,descripcion}};
}
