import {parse,type MessageFormatElement} from '@formatjs/icu-messageformat-parser';
export type TextoEditable={es:string;en:string};
const internas=new Set(['Panel','Acceso','AsesoriaAdmin','PedidosAdmin','PanelLista','Activacion','Analitica','Proveedores','UsuariosPanel','AdministracionCuenta','CambiosPanel']);
export function leerTexto(messages:unknown,clave:string):unknown{
 let valor=messages;for(const segmento of clave.split('.')){if(!valor||typeof valor!=='object'||!Object.hasOwn(valor,segmento))return undefined;valor=(valor as Record<string,unknown>)[segmento];}return valor;
}
export function textosEditables(es:Record<string,unknown>,en:Record<string,unknown>){
 const salida:Record<string,TextoEditable>={};
 function visitar(v:unknown,clave:string){if(typeof v==='string'){const ingles=leerTexto(en,clave);if(typeof ingles==='string'&&!['Marca.telefono','Marca.correo'].includes(clave))salida[clave]={es:v,en:ingles};}else if(v&&typeof v==='object')for(const [k,valor]of Object.entries(v))visitar(valor,clave+'.'+k);}
 for(const [ns,v]of Object.entries(es))if(!ns.startsWith('Admin')&&!internas.has(ns))visitar(v,ns);
 for(const k of ['titulo','consentimiento','privacidadDetalle','preferencias','privacidad','rechazar','soloAnalitica','aceptar'])visitar(leerTexto(es,'Analitica.'+k),'Analitica.'+k);
 return salida;
}
export function aplicarTexto(messages:Record<string,unknown>,clave:string,valor:string){
 const partes=clave.split('.');let destino=messages;
 for(const k of partes.slice(0,-1)){if(!Object.hasOwn(destino,k)||!destino[k]||typeof destino[k]!=='object')return;destino=destino[k] as Record<string,unknown>;}
 const ultima=partes.at(-1)!;if(Object.hasOwn(destino,ultima)&&typeof destino[ultima]==='string')destino[ultima]=valor;
}
function estructura(nodos:MessageFormatElement[]):unknown[]{
 return nodos.filter(n=>n.type!==0).map(n=>{
  if(n.type===7)return {type:n.type};
  if(n.type===8)return {type:n.type,value:n.value,children:estructura(n.children)};
  if(n.type===5||n.type===6)return {type:n.type,value:n.value,...(n.type===6?{offset:n.offset,pluralType:n.pluralType}:{}),options:Object.fromEntries(Object.entries(n.options).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,estructura(v.value)]))};
  return {type:n.type,value:n.value,...('style'in n?{style:n.style}: {})};
 }).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
export function textoCompatible(original:string,nuevo:string){try{return JSON.stringify(estructura(parse(original)))===JSON.stringify(estructura(parse(nuevo)));}catch{return false;}}
