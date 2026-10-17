// Metadata only: no synthetic events, customer rows, credentials or tokens printed.
const url=process.env.CUENTAS_SUPABASE_URL||process.env.SUPABASE_URL;
const clave=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!clave)throw new Error('Falta conexión autorizada a Supabase.');
const local=['127.0.0.1','localhost','[::1]'].includes(new URL(url).hostname);
if(local&&process.env.SG_VERIFICAR_ESTADISTICAS_LOCAL!=='1')throw new Error('La conexión es LOCAL: no verifica producción. Para el laboratorio use SG_VERIFICAR_ESTADISTICAS_LOCAL=1.');
console.log(local?'Entorno verificado: laboratorio local.':'Entorno verificado: Supabase remoto '+new URL(url).hostname);
if(!local&&process.env.SG_ESTADISTICAS_PROYECTO!==new URL(url).hostname.split('.')[0])throw new Error('Confirme SG_ESTADISTICAS_PROYECTO para evitar revisar otro proyecto.');
if(process.env.CUENTAS_SUPABASE_URL&&process.env.SUPABASE_URL&&new URL(process.env.CUENTAS_SUPABASE_URL).origin!==new URL(process.env.SUPABASE_URL).origin)throw new Error('Verificar el proyecto de cuentas antes de consultar el esquema.');
const r=await fetch(new URL('/rest/v1/',url),{headers:{apikey:clave,Authorization:`Bearer ${clave}`,Accept:'application/openapi+json'}});
if(!r.ok)throw new Error(`No se pudo revisar el esquema (${r.status}).`);
const esquema=await r.json();let fallos=0;
const comprobaciones=[['estadisticas_diarias.cantidad',Boolean(esquema.definitions?.estadisticas_diarias?.properties?.cantidad)],['registrar_conteo_anonimo',Boolean(esquema.paths?.['/rpc/registrar_conteo_anonimo'])]];
// OpenAPI hides functions not executable by service_role; probe only read-only RPCs
// with an invalid period, so this never returns customer/order statistics.
for(const nombre of ['resumen_estadisticas_agregadas_panel','popularidad_productos_agregada_panel']){
 let ok=Boolean(esquema.paths?.['/rpc/'+nombre]);
 if(!ok){const p=await fetch(new URL('/rest/v1/rpc/'+nombre,url),{method:'POST',headers:{apikey:clave,Authorization:`Bearer ${clave}`,'Content-Type':'application/json'},body:JSON.stringify({dias:0})});const error=await p.json().catch(()=>null);ok=error?.code==='42501'||error?.code==='P0001'&&['forbidden','invalid_period'].includes(error.message);}
 comprobaciones.push([nombre,ok]);
}
for(const [nombre,ok] of comprobaciones){console.log(`${nombre}: ${ok?'correcto':'FALTA'}`);if(!ok)fallos++;}
if(fallos){console.error('Estadísticas incompletas: aplicar las migraciones pendientes antes de publicar cambios relacionados.');process.exitCode=1;}
