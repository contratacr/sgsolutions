/** Formato de identificación costarricense; no verifica titularidad en el Registro. */
export const tiposIdentificacion=['fisica','juridica','dimex','nite'] as const;
export type TipoIdentificacion=typeof tiposIdentificacion[number];
export function formatoIdentificacion(tipo:string|undefined){switch(tipo){case 'juridica':case 'nite':return {maximo:10,patron:'[0-9]{10}',digitos:'10'};case 'dimex':return {maximo:12,patron:'[1-9][0-9]{10,11}',digitos:'11 o 12'};default:return {maximo:9,patron:'[1-9][0-9]{8}',digitos:'9'};}}
export function identificacionCompraValida(tipo:string|undefined,valor:string){if(tipo!==undefined&&!tiposIdentificacion.includes(tipo as TipoIdentificacion))return false;return new RegExp('^(?:'+formatoIdentificacion(tipo).patron+')$').test(valor.trim().replace(/[\s-]/g,''));}
