import 'server-only';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {adminLocalDisponible} from './admin-local';
import {conteoAnonimo,type ConteoAnonimo} from './estadisticas-agregadas-modelo';
type Contador=ConteoAnonimo&{fecha:string;cantidad:number};
const archivo='.privado/estadisticas-agregadas-local.json';
let cola=Promise.resolve();
export async function leerContadoresLocales():Promise<Contador[]>{try{return JSON.parse(await readFile(archivo,'utf8'));}catch{return [];}}
export async function registrarConteo(datos:ConteoAnonimo){
 const evento=conteoAnonimo.parse(datos);
 if(await adminLocalDisponible()){
  const tarea=cola.then(async()=>{const fecha=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const filas=(await leerContadoresLocales()).filter(f=>f.fecha>=new Date(Date.now()-30*86400000).toISOString().slice(0,10));const fila=filas.find(f=>f.fecha===fecha&&Object.entries(evento).every(([k,v])=>f[k as keyof ConteoAnonimo]===v));if(fila)fila.cantidad++;else filas.push({...evento,fecha,cantidad:1});await mkdir('.privado',{recursive:true});await writeFile(archivo,JSON.stringify(filas),{mode:0o600});});cola=tarea.catch(()=>{});await tarea;return;
 }
 const url=process.env.SUPABASE_URL,clave=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!clave)throw new Error('ESTADISTICAS_SIN_CONFIGURACION');
 const local=['127.0.0.1','localhost','[::1]'].includes(new URL(url).hostname);
 if(!local&&!['produccion','test'].includes(process.env.SG_ENTORNO??'local'))throw new Error('SUPABASE_REMOTO_BLOQUEADO_EN_LOCAL');
 if(process.env.CUENTAS_SUPABASE_URL&&new URL(process.env.CUENTAS_SUPABASE_URL).origin!==new URL(url).origin)throw new Error('ESTADISTICAS_PROYECTOS_DISTINTOS');
 const r=await fetch(new URL('/rest/v1/rpc/registrar_conteo_anonimo',url),{method:'POST',headers:{apikey:clave,Authorization:`Bearer ${clave}`,'Content-Type':'application/json'},body:JSON.stringify({evento})});
 if(!r.ok){console.error('ESTADISTICAS_REGISTRO_NO_DISPONIBLE',r.status);throw new Error('ESTADISTICAS_NO_DISPONIBLES');}
}
