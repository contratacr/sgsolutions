let abierto=false;
const oyentes=new Set<()=>void>();
export function preferenciasMedicionAbiertas(){return abierto;}
export function preferenciasMedicionServidor(){return false;}
export function suscribirPreferenciasMedicion(oyente:()=>void){oyentes.add(oyente);return()=>{oyentes.delete(oyente);};}
export function abrirPreferenciasMedicion(){abierto=true;oyentes.forEach(oyente=>oyente());}
export function cerrarPreferenciasMedicion(){abierto=false;oyentes.forEach(oyente=>oyente());}

// An absent choice follows the site policy; explicit refusals remain in force.
export function publicidadHabilitada(){
 try{const valor=localStorage.getItem("sg-medicion");if(valor===null)return true;const p=JSON.parse(valor);return p?.publicidad===true;}catch{return false;}
}
