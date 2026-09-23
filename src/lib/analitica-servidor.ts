import 'server-only';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {adminLocalDisponible} from './admin-local';
import {crearClienteServidor} from './supabase/servidor';
import {resumirEventos,type EventoAnalitica,type ResumenAnalitica} from './analitica-modelo';
const archivo='.privado/analitica-local.json';
type Registro=EventoAnalitica&{fecha:number};
async function leer():Promise<Registro[]>{try{return JSON.parse(await readFile(archivo,'utf8'));}catch{return [];}}
let cola=Promise.resolve();
export async function registrarEvento(evento:EventoAnalitica){
 if(await adminLocalDisponible()){
  const tarea=cola.then(async()=>{const eventos=(await leer()).filter(e=>e.fecha>Date.now()-30*86400000);if(eventos.some(e=>e.id===evento.id))return;if(eventos.filter(e=>e.sesion===evento.sesion&&e.fecha>Date.now()-60000).length>=120)throw new Error('limite');eventos.push({...evento,fecha:Date.now()});await mkdir('.privado',{recursive:true});await writeFile(archivo,JSON.stringify(eventos.slice(-50000)),{mode:0o600});});cola=tarea.catch(()=>{});await tarea;return;
 }
 const db=await crearClienteServidor();if(!db)throw new Error('sin_configuracion');const {error}=await db.rpc('registrar_evento',{evento});if(error)throw new Error('no_disponible');
}
export async function resumenAnalitica():Promise<ResumenAnalitica|null>{
 if(await adminLocalDisponible())return resumirEventos((await leer()).filter(e=>e.fecha>Date.now()-30*86400000));
 const db=await crearClienteServidor();if(!db)return null;const {data,error}=await db.rpc('resumen_analitica');return error?null:data as ResumenAnalitica;
}
