/** El consecutivo es una etiqueta pública. Nunca sustituye UUID, tokens o autorización. */
export function referenciaPedido(id:string,numero?:number|string|null){
 if(numero!==null&&numero!==undefined&&/^[1-9]\d*$/.test(String(numero)))return `SG-${String(numero).padStart(4,'0')}`;
 return `SG-${id.replaceAll('-','').slice(0,10).toUpperCase()}`;
}
