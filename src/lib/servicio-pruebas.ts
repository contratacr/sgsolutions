import 'server-only';
/** Isolated integration tests may replace services only with a loopback server. */
export function servicioPruebas(nombre:'eurocomp'|'brevo'|'tilopay'){
 if(process.env.SG_ENTORNO!=='local'||process.env.SG_PRUEBAS_INTEGRACION!=='1')return null;
 const origen=process.env.SG_SERVICIOS_PRUEBA_ORIGEN;
 if(!origen)return null;
 const url=new URL(origen);
 if(url.protocol!=='http:'||url.username||url.password||!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('SERVICIO_PRUEBA_NO_LOCAL');
 return new URL(`/${nombre}`,url.origin).href;
}
