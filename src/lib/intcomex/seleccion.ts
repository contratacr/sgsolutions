import codigos from './seleccion.json';
import type {CatalogoAdmin} from '../catalogo-modelo';

export const seleccionIntcomex:readonly string[]=codigos;
const normalizar=(codigo:string)=>codigo.trim().toUpperCase();
const seleccion=new Set(codigos.map(normalizar));
// Verified in Intcomex Costa Rica's public catalog, 2026-09-24.
const equivalencias:Record<string,string>={'DS-2CD1147G3-LIU(2.8mm)':'ES226HIK18'};
for(const sku of Object.values(equivalencias))seleccion.add(normalizar(sku));
export function estaSeleccionado(sku:string,mpn:string){
 return seleccion.has(normalizar(sku))||seleccion.has(normalizar(mpn));
}
export function resumenSeleccion(catalogo:CatalogoAdmin){
 const presentes=new Set(catalogo.productos.flatMap(p=>[p.proveedor?.sku??'',p.codigoFabricante]).map(normalizar));
 const pendientes=codigos.filter(c=>!presentes.has(normalizar(c))&&!(equivalencias[c]&&presentes.has(normalizar(equivalencias[c]))));
 return {total:codigos.length,encontrados:codigos.length-pendientes.length,pendientes};
}
