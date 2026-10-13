import 'server-only';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {adminLocalDisponible} from './admin-local';
import {crearClienteServidor} from './supabase/servidor';
import {resumirEventos,type EventoAnalitica,type ResumenAnalitica} from './analitica-modelo';
const archivo='.privado/analitica-local.json';
type Registro=EventoAnalitica&{fecha:number};
async function leer():Promise<Registro[]>{try{return JSON.parse(await readFile(archivo,'utf8'));}catch{return [];}}
let cola=Promise.resolve();
export function fechasAnalitica(dias:number){
 const fecha=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}),ahora=Date.now();
 return Array.from({length:dias},(_,i)=>fecha.format(ahora-(dias-1-i)*86400000));
}
export async function registrarEvento(evento:EventoAnalitica){
 if(await adminLocalDisponible()){
  const tarea=cola.then(async()=>{const eventos=(await leer()).filter(e=>e.fecha>Date.now()-30*86400000);if(eventos.some(e=>e.id===evento.id))return;if(eventos.filter(e=>e.sesion===evento.sesion&&e.fecha>Date.now()-60000).length>=120)throw new Error('limite');eventos.push({...evento,fecha:Date.now()});await mkdir('.privado',{recursive:true});await writeFile(archivo,JSON.stringify(eventos.slice(-50000)),{mode:0o600});});cola=tarea.catch(()=>{});await tarea;return;
 }
 const db=await crearClienteServidor();if(!db)throw new Error('sin_configuracion');const {error}=await db.rpc('registrar_evento',{evento});if(error)throw new Error('no_disponible');
}
export async function resumenAnalitica(dias:7|30=30):Promise<ResumenAnalitica|null>{
 if(await adminLocalDisponible()){
  const desde=Date.parse(fechasAnalitica(dias)[0]+'T00:00:00-06:00');
  const eventos=(await leer()).filter(e=>e.fecha>=desde);
  const diario=new Map<string,{fecha:string;visitas:Set<string>;paginas:number}>();
  for(const e of eventos.filter(e=>e.tipo==='pagina')){const fecha=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).format(e.fecha),d=diario.get(fecha)??{fecha,visitas:new Set<string>(),paginas:0};d.visitas.add(e.sesion);d.paginas++;diario.set(fecha,d);}
  const agrupar=(campo:'dispositivo'|'idioma')=>[...new Set(eventos.map(e=>e[campo]))].map(detalle=>({detalle,cantidad:new Set(eventos.filter(e=>e.tipo==='pagina'&&e[campo]===detalle).map(e=>e.sesion)).size}));
  return {...resumirEventos(eventos),diario:[...diario.values()].map(d=>({...d,visitas:d.visitas.size})),dispositivos:agrupar('dispositivo'),idiomas:agrupar('idioma')};
 }
 const db=await crearClienteServidor();if(!db)return null;const {data,error}=await db.rpc('resumen_estadisticas_panel',{dias});
 if(error){console.error('ESTADISTICAS_NO_DISPONIBLES',error.code);return null;}return data as ResumenAnalitica;
}
