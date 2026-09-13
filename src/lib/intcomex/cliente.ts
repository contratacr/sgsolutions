import {createHash} from 'node:crypto';

export type CredencialesIws={apiKey:string;accessKey:string;ambiente:'test'|'produccion'};
export function autorizacionIws(c:CredencialesIws,fecha=new Date()){
 const utcTimeStamp=fecha.toISOString().replace(/\.\d{3}Z$/,'Z');
 const signature=createHash('sha256').update(`${c.apiKey},${c.accessKey},${utcTimeStamp}`).digest('hex');
 return `Bearer apiKey=${c.apiKey}&utcTimeStamp=${utcTimeStamp}&signature=${signature}`;
}
// Solo consultas documentadas. No pedidos, pagos ni credenciales en la URL.
export async function consultarIws(c:CredencialesIws,recurso:'getcatalog'|'getpricelist'|'getinventory',locale?:'es'|'en',transportar:typeof fetch=fetch):Promise<unknown[]>{
 if(!c.apiKey||!c.accessKey)throw new Error('IWS_SIN_CREDENCIALES');
 const base=c.ambiente==='produccion'?'https://intcomex-prod.apigee.net/v1/':'https://intcomex-test.apigee.net/v1/';
 const url=new URL(recurso,base);
 if(locale)url.searchParams.set('locale',locale);
 if(recurso==='getcatalog')url.searchParams.set('inventoryFilter','Any');
 for(let intento=0;intento<3;intento++){
  let respuesta:Response;
  try{respuesta=await transportar(url,{headers:{Authorization:autorizacionIws(c),Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(90000),cache:'no-store'});}
  catch{throw new Error('IWS_CONEXION');}
  if((respuesta.status===429||respuesta.status>=500)&&intento<2){await new Promise(r=>setTimeout(r,1000*2**intento));continue;}
  if(!respuesta.ok)throw new Error(`IWS_HTTP_${respuesta.status}`);
  let datos:unknown;try{datos=await respuesta.json();}catch{throw new Error('IWS_FORMATO');}
  // No tratar una respuesta de error o una página parcial como catálogo completo.
  if(!Array.isArray(datos)||datos.length===0||datos.some(x=>x&&typeof x==='object'&&('data' in x||'ErrorCode' in x)))throw new Error('IWS_RESPUESTA_INCOMPLETA');
  return datos;
 }
 throw new Error('IWS_NO_DISPONIBLE');
}
