// OpenNext owns HTTP; only the private retry/retention job is added here.
import worker from './.open-next/worker.js';
export * from './.open-next/worker.js';
const aplicacion = {
 fetch:worker.fetch,
 scheduled(_event,env,ctx){
  if(!env.SG_MEDICION_PROCESADOR_SECRET||env.SG_ENTORNO!=='produccion')return;
  ctx.waitUntil(env.WORKER_SELF_REFERENCE.fetch('https://sgsolutionscr.com/api/interno/medicion/procesar',{method:'POST',headers:{Authorization:`Bearer ${env.SG_MEDICION_PROCESADOR_SECRET}`}}).then(r=>{if(!r.ok)console.error('MEDICION_TAREA_PENDIENTE');}).catch(()=>console.error('MEDICION_TAREA_PENDIENTE')));
 }
};

export default aplicacion;
