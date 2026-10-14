import {esProductoEurocomp} from './catalogo-fuente';
import {asignarRutasProductos} from './rutas-productos';
import {type CatalogoAdmin, type CatalogoPublico} from './catalogo-modelo';

const textos={
 titulo:{es:'SG Solutions',en:'SG Solutions'},
 descripcion:{es:'Tecnología que funciona para usted. Le ayudamos a elegir equipos compatibles y la solución adecuada para su hogar o negocio.',en:'Technology that works for you. We help you choose compatible equipment and the right solution for your home or business.'},
 aviso:{es:'Precios de referencia con IVA incluido. Su carrito no reserva productos ni genera un cobro.',en:'Reference prices include VAT. Your cart does not reserve products or create a charge.'}
};

// Preserve editorial changes only for products originating in Eurocomp.
export function catalogoPublicoManual(c:CatalogoPublico):CatalogoPublico{
 return actualizarPromesa({...c,gestion:'manual',productos:asignarRutasProductos(c.productos.filter(esProductoEurocomp))});
}
export function migrarCatalogoManual(c:CatalogoAdmin):CatalogoAdmin{
 const siguiente={...c,gestion:'manual' as const,productos:c.productos.filter(esProductoEurocomp).map(p=>{
  const limpio={...p};delete limpio.proveedor;delete limpio.codigoIntcomex;delete limpio.estadoIntcomex;return limpio;
 })};
 delete siguiente.sincronizacion;delete siguiente.inventario;
 return actualizarPromesa(siguiente);
}

function actualizarPromesa<T extends CatalogoAdmin|CatalogoPublico>(c:T):T{
 const anteriores={es:'Compra tecnología. Obtén asesoría. Nosotros nos encargamos del resto.',en:'Buy technology. Get advice. We take care of the rest.'};
 const descripcion={...c.textos.descripcion};
 for(const l of ['es','en'] as const)if(descripcion[l]===anteriores[l])descripcion[l]=textos.descripcion[l];
 return {...c,textos:{...c.textos,descripcion}};
}
