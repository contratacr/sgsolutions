import 'server-only';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,readFile,unlink} from 'node:fs/promises';
import {guardarLocal,leerLocal,sesionLocal} from './admin-local';
import {type EntidadSoporte,type FilaSoporte,type DatosSoporte} from './soporte-modelo';
const responsable='00000000-0000-4000-8000-000000000001';
type Adjunto={id:string;ticket_id:string;nombre:string;tipo:string;ruta:string;bytes:number};
type Almacen={filas:Record<EntidadSoporte,FilaSoporte[]>;historial:DatosSoporte['historial'];adjuntos:Adjunto[]};
async function cargar(){if(!await sesionLocal())throw new Error('SIN_PERMISO');const actual=await leerLocal<Almacen>('soporte');return {contenido:actual?.contenido??{filas:{tickets:[],empresas:[],equipos:[],mantenimientos:[]},historial:[],adjuntos:[]},revision:actual?.revision??0};}
async function persistir(almacen:Awaited<ReturnType<typeof cargar>>){const r=await guardarLocal('soporte',almacen.contenido,almacen.revision);if(r.error)throw new Error(r.error==='conflicto'?'CONFLICTO':'SIN_PERMISO');}
function auditar(almacen:Almacen,entidad:EntidadSoporte,fila:FilaSoporte,accion:string){almacen.historial.unshift({id:almacen.historial.length+1,entidad,registro_id:fila.id,accion,fecha:new Date().toISOString(),actor_nombre:null});}
export async function leerSoporteLocal(tipo:EntidadSoporte,q:string,archivado:boolean,pagina:number):Promise<DatosSoporte>{
 const {contenido:c}=await cargar(),sesion=await sesionLocal();const activas=(t:EntidadSoporte)=>c.filas[t].filter(f=>!f.archivado);
 const campo=tipo==='empresas'?'razon_social':tipo==='equipos'?'nombre':tipo==='tickets'?'asunto':'descripcion';
 const filas=c.filas[tipo].filter(f=>f.archivado===archivado&&String(f[campo]).toLocaleLowerCase().includes(q.toLocaleLowerCase())).sort((a,b)=>b.actualizado_en.localeCompare(a.actualizado_en));
 return {filas:filas.slice((pagina-1)*25,pagina*25),total:filas.length,empresas:activas('empresas').map(e=>({id:e.id,nombre:String(e.razon_social)})),equipos:activas('equipos').map(e=>({id:e.id,nombre:`${e.nombre} · ${e.numero_serie}`,empresa_id:e.empresa_id as string|null})),tecnicos:[{id:responsable,nombre:sesion!.correo}],tickets:activas('tickets').map(e=>({id:e.id,nombre:`ST-${e.numero} · ${e.asunto}`,equipo_id:e.equipo_id as string|null})),historial:c.historial};
}
export async function guardarSoporteLocal(tipo:EntidadSoporte,datos:Record<string,unknown>,registro:string|null,version:number){
 const almacen=await cargar(),c=almacen.contenido,anterior=c.filas[tipo].find(f=>f.id===registro);
 if(registro&&(!anterior||anterior.version!==version||anterior.archivado)||!registro&&version!==0)throw new Error('CONFLICTO');
 const referencia=(t:EntidadSoporte,id:unknown)=>c.filas[t].find(f=>f.id===id&&!f.archivado);
 if(datos.empresa_id&&(!anterior||datos.empresa_id!==anterior.empresa_id)&&!referencia('empresas',datos.empresa_id))throw new Error('RELACION_INVALIDA');
 if(tipo==='tickets'&&datos.equipo_id&&(!anterior||datos.equipo_id!==anterior.equipo_id||datos.empresa_id!==anterior.empresa_id)){
  const equipo=referencia('equipos',datos.equipo_id);if(!equipo||equipo.empresa_id!==datos.empresa_id)throw new Error('RELACION_INVALIDA');
 }
 if(tipo==='mantenimientos'){
  if((!anterior||datos.equipo_id!==anterior.equipo_id)&&!referencia('equipos',datos.equipo_id))throw new Error('RELACION_INVALIDA');
  if(datos.ticket_id&&(!anterior||datos.ticket_id!==anterior.ticket_id||datos.equipo_id!==anterior.equipo_id)){const ticket=referencia('tickets',datos.ticket_id);if(!ticket||ticket.equipo_id!==datos.equipo_id)throw new Error('RELACION_INVALIDA');}
 }
 if(datos.tecnico_id&&datos.tecnico_id!==responsable)throw new Error('RELACION_INVALIDA');
 const campo=tipo==='empresas'?'identificacion':tipo==='equipos'?'numero_serie':null;
 if(campo&&c.filas[tipo].some(f=>f.id!==registro&&String(f[campo]).trim().toLowerCase()===String(datos[campo]).trim().toLowerCase()))throw new Error('duplicate key');
 const fila={...datos,id:registro??randomUUID(),numero:anterior?.numero??Math.max(0,...c.filas[tipo].map(f=>f.numero))+1,version:(anterior?.version??0)+1,archivado:false,creado_en:anterior?.creado_en??new Date().toISOString(),actualizado_en:new Date().toISOString()} as FilaSoporte;
 c.filas[tipo]=[fila,...c.filas[tipo].filter(f=>f.id!==fila.id)];auditar(c,tipo,fila,anterior?'actualizado':'creado');await persistir(almacen);
}
export async function archivarSoporteLocal(tipo:EntidadSoporte,id:string,version:number,archivar:boolean){const a=await cargar(),fila=a.contenido.filas[tipo].find(f=>f.id===id);if(!fila||fila.version!==version||fila.archivado===archivar)throw new Error('CONFLICTO');fila.archivado=archivar;fila.version++;fila.actualizado_en=new Date().toISOString();auditar(a.contenido,tipo,fila,archivar?'archivado':'restaurado');await persistir(a);}
export async function resumenSoporteLocal(){const a=await cargar(),activos=a.contenido.filas.tickets.filter(t=>!t.archivado);const mesActual=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit'}).format(new Date());const meses=Array.from({length:6},(_,i)=>{const fecha=new Date(mesActual+'-15T12:00:00Z');fecha.setUTCMonth(fecha.getUTCMonth()-5+i);const mes=fecha.toISOString().slice(0,7);return {mes,cantidad:activos.filter(t=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit'}).format(new Date(t.creado_en))===mes).length};});return {pendientes:activos.filter(t=>t.estado==='pendiente').length,enProceso:activos.filter(t=>t.estado==='en_proceso').length,programados:a.contenido.filas.mantenimientos.filter(m=>!m.archivado&&!m.completado).length,meses};}
export async function listarAdjuntosLocales(ticket:string){return (await cargar()).contenido.adjuntos.filter(a=>a.ticket_id===ticket).map(a=>({id:a.id,nombre:a.nombre}));}
export async function guardarAdjuntoLocal(ticket:string,nombre:string,tipo:string,bytes:Uint8Array){
 const a=await cargar(),fila=a.contenido.filas.tickets.find(t=>t.id===ticket&&!t.archivado);if(!fila)throw new Error('RELACION_INVALIDA');if(a.contenido.adjuntos.filter(f=>f.ticket_id===ticket).length>=10)throw new Error('LIMITE_ADJUNTOS');
 const id=randomUUID(),ruta='.privado/soporte-adjuntos/'+id;await mkdir('.privado/soporte-adjuntos',{recursive:true,mode:0o700});await writeFile(ruta,bytes,{mode:0o600});a.contenido.adjuntos.push({id,ticket_id:ticket,nombre,tipo,bytes:bytes.length,ruta});fila.version++;fila.actualizado_en=new Date().toISOString();auditar(a.contenido,'tickets',fila,'actualizado');try{await persistir(a);}catch(e){await unlink(ruta).catch(()=>{});throw e;}
}
export async function leerAdjuntoLocal(id:string){const a=(await cargar()).contenido.adjuntos.find(a=>a.id===id);if(!a)return null;return {nombre:a.nombre,tipo:a.tipo,bytes:await readFile('.privado/soporte-adjuntos/'+id)};}
