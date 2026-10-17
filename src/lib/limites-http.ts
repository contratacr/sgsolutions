/** Bound memory use even when Content-Length is missing or dishonest. */
export async function leerBytesLimitados(request:Request,limite:number):Promise<Uint8Array>{
 const declarada=Number(request.headers.get('content-length')??0);
 if(Number.isFinite(declarada)&&declarada>limite)throw new Error('CUERPO_EXCESIVO');
 if(!request.body)return new Uint8Array();
 const lector=request.body.getReader(),partes:Uint8Array[]=[];let total=0;
 try{
  for(;;){const {done,value}=await lector.read();if(done)break;total+=value.byteLength;if(total>limite){void lector.cancel().catch(()=>{});throw new Error('CUERPO_EXCESIVO');}partes.push(value);}
 }finally{lector.releaseLock();}
 const bytes=new Uint8Array(total);let posicion=0;for(const parte of partes){bytes.set(parte,posicion);posicion+=parte.byteLength;}return bytes;
}
export async function leerTextoLimitado(request:Request,limite:number){return new TextDecoder().decode(await leerBytesLimitados(request,limite));}
