import type {SupabaseClient} from '@supabase/supabase-js';
import {esquemaCatalogo,publicarCatalogo} from './catalogo-modelo';
import {reconciliarEurocomp} from './eurocomp-catalogo';
import {ErrorEurocomp,type CatalogoEurocomp} from './eurocomp-protocolo';

const transitorios=new Set(['57014','55P03','40P01','40001','08000','08006','PGRST000','PGRST001','PGRST002']);
export function publicacionReintentable(error:{code?:string;message?:string},status:number){
 return transitorios.has(error.code??'')||error.message==='CONFLICTO'||status===0||[502,503,504].includes(status);
}
/** Fresh read on every attempt: never replay a stale snapshot over a manual sale/edit. */
export async function publicarCopiaEurocomp(db:SupabaseClient,token:string,copia:CatalogoEurocomp,diagnostico:(datos:{intento:number;etapa:string;ms:number;codigo?:string;http?:number;productos?:number})=>void=()=>{}){
 if(!copia.articulos.length)throw new ErrorEurocomp('respuesta');
 for(let intento=1;intento<=3;intento++){
  const inicio=Date.now();
  const r=await db.rpc('preparar_publicacion_eurocomp',{token_esperado:token,nuevo_catalogo:copia}).abortSignal(AbortSignal.timeout(15_000));
  if(!r.error&&r.data===true){diagnostico({intento,etapa:'copia_preparada',ms:Date.now()-inicio});break;}
  diagnostico({intento,etapa:'copia',ms:Date.now()-inicio,codigo:r.error?.code,http:r.status});
  if(r.error&&intento<3&&publicacionReintentable(r.error,r.status)){await pausa(intento);continue;}
  throw new ErrorEurocomp('almacenamiento');
 }

 for(let intento=1;intento<=3;intento++){
  const inicio=Date.now();
  const lectura=await db.from('catalogo_privado').select('contenido,revision').eq('id',1).abortSignal(AbortSignal.timeout(15_000)).single();
  if(lectura.error||!lectura.data){
   const error=lectura.error??{code:'SIN_DATOS'};
   diagnostico({intento,etapa:'lectura',ms:Date.now()-inicio,codigo:error.code,http:lectura.status});
   if(intento<3&&publicacionReintentable(error,lectura.status)){await pausa(intento);continue;}
   throw new ErrorEurocomp('almacenamiento');
  }
  const privado=esquemaCatalogo.parse(reconciliarEurocomp(esquemaCatalogo.parse(lectura.data.contenido),copia));
  const visible=publicarCatalogo(privado);
  const escritura=await db.rpc('publicar_eurocomp',{token_esperado:token,nuevo_catalogo:null,privado,visible,revision_esperada:lectura.data.revision}).abortSignal(AbortSignal.timeout(15_000));
  if(!escritura.error){
   if(!Number.isInteger(escritura.data)||escritura.data<1)throw new ErrorEurocomp('almacenamiento');
   diagnostico({intento,etapa:'confirmada',ms:Date.now()-inicio,productos:visible.productos.length});
   return {productos:visible.productos.length,revision:escritura.data as number,intentos:intento};
  }
  diagnostico({intento,etapa:'publicacion',ms:Date.now()-inicio,codigo:escritura.error.code,http:escritura.status});
  if(intento<3&&publicacionReintentable(escritura.error,escritura.status)){await pausa(intento);continue;}
  throw new ErrorEurocomp(escritura.error.message==='CONFLICTO'?'conflicto':'almacenamiento');
 }
 throw new ErrorEurocomp('almacenamiento');
}
function pausa(intento:number){return new Promise<void>(r=>setTimeout(r,intento*500));}
