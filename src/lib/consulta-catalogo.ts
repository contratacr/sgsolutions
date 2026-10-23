// Una consulta lenta debe terminar en un error recuperable, no en carga infinita.
export async function consultarJsonCatalogo<T>(url:string,signal:AbortSignal):Promise<T>{
 const controller=new AbortController();
 const cancelar=()=>controller.abort();
 signal.addEventListener('abort',cancelar,{once:true});
 if(signal.aborted)controller.abort();
 const limite=setTimeout(cancelar,15000);
 try{
  const respuesta=await fetch(url,{signal:controller.signal});
  if(!respuesta.ok)throw new Error('CATALOGO_NO_DISPONIBLE');
  return await respuesta.json() as T;
 }finally{clearTimeout(limite);signal.removeEventListener('abort',cancelar);}
}
