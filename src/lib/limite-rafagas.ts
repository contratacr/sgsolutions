// Best-effort per-instance protection; distributed limits belong at the edge.
const intentos=new Map<string,{cantidad:number;hasta:number}>();
export function permitirRafaga(clave:string,maximo=20,ventana=600000,ahora=Date.now()){
 for(const [k,v] of intentos)if(v.hasta<=ahora)intentos.delete(k);
 const intento=intentos.get(clave)??{cantidad:0,hasta:ahora+ventana};
 if(intento.cantidad>=maximo||!intentos.has(clave)&&intentos.size>=5000)return false;
 intentos.set(clave,{...intento,cantidad:intento.cantidad+1});return true;
}
