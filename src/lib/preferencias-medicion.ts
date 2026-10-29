import {VERSION_PUBLICIDAD} from './campanas-modelo';
export const VERSION_PREFERENCIAS_MEDICION='2026-10-29-v2';
export type PreferenciasMedicion={analitica:boolean;publicidad:boolean;version:string;fecha:string};
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
 try{const p=JSON.parse(localStorage.getItem('sg-medicion')||'null');if([VERSION_PREFERENCIAS_MEDICION,'2026-10-29-v1'].includes(p?.version)&&typeof p.analitica==='boolean'&&typeof p.publicidad==='boolean')return p;if(p?.publicidad===false)return {analitica:false,publicidad:false,version:VERSION_PREFERENCIAS_MEDICION,fecha:''};if(p?.publicidad===true&&p?.version===VERSION_PUBLICIDAD)return {analitica:false,publicidad:true,version:VERSION_PREFERENCIAS_MEDICION,fecha:''};return null;}catch{return null;}
}
export function publicidadHabilitada(){return leerPreferenciasMedicion()?.publicidad===true;}
export function analiticaHabilitada(){return leerPreferenciasMedicion()?.analitica===true;}
