import modelos from './modelos-exclusivos-empresas.json';
import seleccionEmpresarial from './seleccion-empresarial.json';
/** Public snapshots retain the Eurocomp code; private records also retain API stock. */
export function esProductoEurocomp(p:{id:string;codigoEurocomp?:string;eurocomp?:{codigo:string}}) {
 return Boolean(p.id.startsWith('eurocomp-') && (p.eurocomp?.codigo?.trim() || p.codigoEurocomp?.trim()));
}

/** Closed selection: supplier records cannot enter the general store. */
export function esProductoEmpresarial(p:{id:string;coleccion?:string;solucionEmpresarial?:string;codigoIntcomex?:string}){
 const sku=p.codigoIntcomex??p.id.replace(/^empresa-intcomex-/, '').toUpperCase();
 return p.coleccion==='empresas'&&p.id===`empresa-intcomex-${sku.toLowerCase()}`&&p.solucionEmpresarial===(seleccionEmpresarial as Record<string,string>)[sku]&&Boolean(p.solucionEmpresarial);
}

const modelosEmpresariales=new Set(modelos);
/** Prevent the same model from leaking through another supplier's SKU. */
export function esDuplicadoEmpresarial(p:{coleccion?:string;marca:string;codigoFabricante?:string}){
 return p.coleccion!=='empresas'&&modelosEmpresariales.has(p.marca.trim().toUpperCase()+'|'+(p.codigoFabricante??'').toUpperCase().replace(/\s+/g,''));
}
