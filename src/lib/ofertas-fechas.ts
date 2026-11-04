/** The shop operates in Costa Rica (UTC−06:00, without daylight saving time). */
export function fechaOfertaLocal(iso?:string|null){
 return iso?new Date(Date.parse(iso)-6*3600_000).toISOString().slice(0,16):'';
}
export function fechaOfertaUtc(local:string){
 return local?new Date(local+'-06:00').toISOString():null;
}
