export const VERSION_PREFERENCIAS_MEDICION='2026-11-03-v1';
/** How the choice was made: a click on Continuar/Guardar, the X, or moving to another page. */
export type OrigenPreferencia='click'|'close'|'implicit';
export type PreferenciasMedicion={analitica:boolean;publicidad:boolean;version:string;fecha:string;origen?:OrigenPreferencia};
let abierto=false;
let preferenciaTemporal:PreferenciasMedicion|null=null;
export function guardarPreferenciasMedicion(p:PreferenciasMedicion){preferenciaTemporal=null;try{localStorage.setItem('sg-medicion',JSON.stringify(p));}catch{preferenciaTemporal=p;/* La elección sigue vigente en esta página aunque el navegador bloquee el almacenamiento. */}}
const oyentes=new Set<()=>void>();
export function preferenciasMedicionAbiertas(){return abierto;}
export function preferenciasMedicionServidor(){return false;}
export function suscribirPreferenciasMedicion(oyente:()=>void){oyentes.add(oyente);return()=>{oyentes.delete(oyente);};}
export function abrirPreferenciasMedicion(){abierto=true;oyentes.forEach(oyente=>oyente());}
export function cerrarPreferenciasMedicion(){abierto=false;oyentes.forEach(oyente=>oyente());}

export function leerPreferenciasMedicion():PreferenciasMedicion|null{
 if(preferenciaTemporal)return preferenciaTemporal;
 try{const p=JSON.parse(localStorage.getItem('sg-medicion')||'null');if([VERSION_PREFERENCIAS_MEDICION,'2026-11-02-v3'].includes(p?.version)&&typeof p.analitica==='boolean'&&typeof p.publicidad==='boolean')return p;if(p?.publicidad===false&&p?.analitica!==true)return {analitica:false,publicidad:false,version:VERSION_PREFERENCIAS_MEDICION,fecha:''};return null;}catch{return null;}
}
export function publicidadHabilitada(){return leerPreferenciasMedicion()?.publicidad===true;}
export function analiticaHabilitada(){return leerPreferenciasMedicion()?.analitica===true;}

/**
 * A refusal saved earlier, read from the raw stored value on purpose: an older notice version or a mixed choice
 * must never look "undecided". Returns the purposes the person already refused; if storage cannot be read,
 * both count as refused so nothing is accepted on the visitor's behalf.
 */
export function rechazosGuardados():{analitica:boolean;publicidad:boolean}{
 try{
  const bruto=localStorage.getItem('sg-medicion');
  if(bruto===null)return {analitica:false,publicidad:false};
  const p=JSON.parse(bruto);
  if(!p||typeof p!=='object')return {analitica:true,publicidad:true};
  return {analitica:p.analitica===false||typeof p.analitica!=='boolean',publicidad:p.publicidad===false||typeof p.publicidad!=='boolean'};
 }catch{return {analitica:true,publicidad:true};}
}
function almacenamientoLegible(){try{localStorage.getItem('sg-medicion');return true;}catch{return false;}}
/**
 * Accepts what is still undecided and keeps any refusal. Returns false when nothing was saved.
 * Only an explicit click may proceed when storage is unreadable (the choice then lives for the page only).
 */
export function aceptarPendiente(origen:OrigenPreferencia):boolean{
 const legible=almacenamientoLegible();
 if(origen!=='click'&&!legible)return false;
 const r=legible?rechazosGuardados():{analitica:false,publicidad:false};
 const previa=leerPreferenciasMedicion();
 if(previa&&origen==='implicit')return false;
 const analitica=!r.analitica,publicidad=!r.publicidad;
 if(!analitica&&!publicidad)return false;
 guardarPreferenciasMedicion({analitica,publicidad,version:VERSION_PREFERENCIAS_MEDICION,fecha:new Date().toISOString(),origen});
 return true;
}
