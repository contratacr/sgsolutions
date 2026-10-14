let abierto=false;
const oyentes=new Set<()=>void>();
export function preferenciasMedicionAbiertas(){return abierto;}
export function preferenciasMedicionServidor(){return false;}
export function suscribirPreferenciasMedicion(oyente:()=>void){oyentes.add(oyente);return()=>{oyentes.delete(oyente);};}
export function abrirPreferenciasMedicion(){abierto=true;oyentes.forEach(oyente=>oyente());}
export function cerrarPreferenciasMedicion(){abierto=false;oyentes.forEach(oyente=>oyente());}
