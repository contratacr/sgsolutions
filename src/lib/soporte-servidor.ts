import 'server-only';
import {leerSoporteLocal} from './soporte-local';
import {accesoUsuarios} from './usuarios-panel';
import type {DatosSoporte,EntidadSoporte} from './soporte-modelo';
export async function accesoSoporte(){
 const acceso=await accesoUsuarios();
 // Local preview uses the same protected panel session, but never writes remotely.
 return acceso;
}
export async function leerSoporte(entidad:EntidadSoporte,q:string,archivado:boolean,pagina:number):Promise<DatosSoporte>{
 const acceso=await accesoSoporte();if(acceso.local)return leerSoporteLocal(entidad,q,archivado,pagina);
 const {cliente}=acceso;
 const columna=entidad==='empresas'?'razon_social':entidad==='equipos'?'nombre':entidad==='tickets'?'asunto':'descripcion';
 let consulta=cliente.from('soporte_'+entidad).select('*',{count:'exact'}).eq('archivado',archivado).order('actualizado_en',{ascending:false}).order('id').range((pagina-1)*25,pagina*25-1);
 if(q)consulta=consulta.ilike(columna,'%'+q.replace(/[%_]/g,'')+'%');
 const resultados=await Promise.all([
  consulta,
  cliente.from('soporte_empresas').select('id,razon_social').eq('archivado',false).order('razon_social').limit(500),
  cliente.from('soporte_equipos').select('id,nombre,numero_serie,empresa_id').eq('archivado',false).order('nombre').limit(500),
  cliente.from('perfiles').select('id,nombre').eq('rol','administrador').eq('activo',true).order('nombre').limit(500),
  cliente.from('soporte_tickets').select('id,numero,asunto,equipo_id').eq('archivado',false).order('numero',{ascending:false}).limit(500)
 ]);
 if(resultados.some(r=>r.error))throw new Error('SOPORTE_NO_DISPONIBLE');
 const [filas,empresas,equipos,tecnicos,tickets]=resultados;
 const ids=(filas.data??[]).map(f=>f.id);
 const historial=ids.length?await cliente.from('soporte_historial').select('id,entidad,registro_id,accion,fecha,actor').in('registro_id',ids).order('fecha',{ascending:false}).limit(100):{data:[],error:null};
 if(historial.error)throw new Error('SOPORTE_NO_DISPONIBLE');
 return {filas:filas.data??[],total:filas.count??0,empresas:(empresas.data??[]).map(e=>({id:e.id,nombre:e.razon_social})),equipos:(equipos.data??[]).map(e=>({id:e.id,nombre:`${e.nombre} · ${e.numero_serie}`,empresa_id:e.empresa_id})),tecnicos:tecnicos.data??[],tickets:(tickets.data??[]).map(e=>({id:e.id,nombre:`ST-${e.numero} · ${e.asunto}`,equipo_id:e.equipo_id})),historial:(historial.data??[]).map(h=>({id:h.id,entidad:h.entidad,registro_id:h.registro_id,accion:h.accion,fecha:h.fecha,actor_nombre:tecnicos.data?.find(t=>t.id===h.actor)?.nombre??null}))};
}
