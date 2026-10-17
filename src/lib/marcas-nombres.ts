import logos from './marcas-logos.json';
export const claveMarca=(nombre:string)=>nombre.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
const nombres=new Map(Object.keys(logos).map(nombre=>[claveMarca(nombre),nombre]));
// Explicit aliases only: product lines from different brands must not be merged.
nombres.set('CUSTOMAMERICA','Custom');
export function nombreMarca(nombre:string){return nombres.get(claveMarca(nombre))??nombre.trim().toUpperCase();}
