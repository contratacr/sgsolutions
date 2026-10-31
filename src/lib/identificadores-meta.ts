/** Reuse only bounded, recent Meta identifiers after advertising permission. */
export function identificadorMetaVigente(valor:string|undefined,tipo:'fbc'|'fbp',ahora=Date.now()){
 const patron=tipo==='fbc'?/^fb\.1\.(\d{13})\.[A-Za-z0-9_-]{1,300}$/:/^fb\.1\.(\d{13})\.\d{1,20}$/;
 const coincidencia=valor?.match(patron);if(!coincidencia)return undefined;
 const fecha=Number(coincidencia[1]);
 return fecha<=ahora&&ahora-fecha<30*86400000?valor:undefined;
}
export function conservarClicMeta(actual:string|undefined,heredado:string|undefined,ahora=Date.now()){
 const valido=identificadorMetaVigente(heredado,'fbc',ahora);
 if(!valido)return actual;
 return !actual||Number(valido.split('.')[2])>Number(actual.split('.')[2])?valido:actual;
}
