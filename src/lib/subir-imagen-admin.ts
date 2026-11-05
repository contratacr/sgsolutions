/** No versioned Server Action IDs and no automatic retry of a possibly saved file. */
export async function subirImagenAdmin(datos:FormData):Promise<{src?:string;error?:string}>{
 try{
  const respuesta=await fetch('/api/panel/imagenes',{method:'POST',body:datos,credentials:'same-origin',cache:'no-store'});
  if(respuesta.status===401||respuesta.status===403)return {error:'sinPermiso'};
  if(respuesta.status===413)return {error:'archivoInvalido'};
  const resultado=await respuesta.json();
  if(respuesta.ok&&typeof resultado.src==='string')return {src:resultado.src};
  return {error:['archivoInvalido','sinPermiso'].includes(resultado.error)?resultado.error:'errorCarga'};
 }catch{return {error:'errorCarga'};}
}
