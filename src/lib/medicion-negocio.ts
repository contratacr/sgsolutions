import 'server-only';
import {baseMedicion,permiteMedicionServidor} from './medicion-servidor';
import {contextoActual,idMedicion,encolarPublicidad} from './publicidad-servidor';
import type {ContextoPublicidad,HitoNegocio} from './campanas-modelo';
export type OperacionMedicion='asesoria'|'empresa'|'manual'|'tarjeta';
export async function hitoNegocio(tipo:HitoNegocio|'campana_visita',operacion:string,idioma:'es'|'en',contexto:ContextoPublicidad|null,excluir=false){
 const db=baseMedicion();if(!db)return;
 const r=await db.rpc('registrar_hito_negocio',{entrada:{clave:idMedicion(`${tipo}:${operacion}`),tipo,idioma,contexto,excluir}});if(r.error)throw new Error('MEDICION_HITO_PENDIENTE');
}
/** Called only after a business write succeeds. Never depends on a client "success" event. */
export async function registrarOperacion(tipo:OperacionMedicion,operacion:string,idioma:'es'|'en',entorno='produccion'){
 try{
  const db=baseMedicion();if(!db)return;
  const excluir=entorno!=='produccion'||process.env.SG_ENTORNO!=='produccion'||!await permiteMedicionServidor();
  const contexto=excluir?null:await contextoActual();
  const r=await db.from('medicion_operaciones').upsert({clave:idMedicion(`${tipo}:${operacion}`),tipo,operacion,excluir,contexto,idioma},{onConflict:'tipo,operacion',ignoreDuplicates:true});if(r.error)throw new Error('almacenamiento');
  const {data:m,error:lectura}=await db.from('medicion_operaciones').select('excluir,contexto,idioma,conversion_registrada').eq('tipo',tipo).eq('operacion',operacion).single();if(lectura||!m)throw new Error('lectura');
  const solicitud=tipo==='asesoria'||tipo==='empresa',original=m.contexto as ContextoPublicidad|null;
  await hitoNegocio(solicitud?'solicitud_recibida':'pedido_creado',`${tipo}:${operacion}`,m.idioma,original,m.excluir);
  if(solicitud&&!m.conversion_registrada){
   if(original&&!m.excluir)await encolarPublicidad(original,'Lead',idMedicion(`Lead:${tipo}:${operacion}`),tipo==='empresa'?'/empresas':'/contacto');
   await db.from('medicion_operaciones').update({conversion_registrada:true}).eq('tipo',tipo).eq('operacion',operacion);
  }
 }catch{console.error('MEDICION_OPERACION_NO_DISPONIBLE');}
}
export async function registrarPago(tipo:'manual'|'tarjeta',operacion:string){
 try{
  const db=baseMedicion();if(!db||process.env.SG_ENTORNO!=='produccion')return;
  const tabla=tipo==='tarjeta'?'pedidos_tilopay':'pedidos_manuales';
  const {data:p,error}=await db.from(tabla).select(tipo==='tarjeta'?'estado,entorno,total':'estado,entorno,total_cobrar').eq('id',operacion).maybeSingle();
  if(error||p?.estado!=='pagado'||p.entorno!=='produccion')return;
  const elegible=await db.rpc('medicion_operacion_elegible',{tipo_operacion:tipo,id_operacion:operacion});if(elegible.error||elegible.data!==true)return;
  const {data:m}=await db.from('medicion_operaciones').select('excluir,contexto,idioma').eq('tipo',tipo).eq('operacion',operacion).maybeSingle();
  // Missing pre-release consent/context is never reconstructed from customer data.
  if(!m||m.excluir)return;
  const c=m.contexto as ContextoPublicidad|null;
  await hitoNegocio('pago_confirmado',`${tipo}:${operacion}`,m.idioma,c);
  if(c&&c.vence>Date.now())await encolarPublicidad(c,'Purchase',idMedicion(`Purchase:${tipo}:${operacion}`),'/finalizar-compra',undefined,Number('total' in p?p.total:p.total_cobrar));
  await db.from('medicion_operaciones').update({conversion_registrada:true}).eq('tipo',tipo).eq('operacion',operacion);
 }catch{console.error('MEDICION_PAGO_NO_DISPONIBLE');}
}
export async function registrarCotizacion(id:string){
 try{const db=baseMedicion();if(!db)return;const {data:m}=await db.from('medicion_operaciones').select('contexto,excluir,idioma').eq('tipo','asesoria').eq('operacion',id).maybeSingle();if(m&&!m.excluir)await hitoNegocio('cotizacion_preparada','asesoria:'+id,m.idioma,m.contexto);}catch{console.error('MEDICION_COTIZACION_NO_DISPONIBLE');}
}

export async function reconciliarPagosMedicion(){const db=baseMedicion();if(!db)return;const {data}=await db.rpc('medicion_pagos_pendientes');for(const m of data??[])await registrarPago(m.tipo,m.operacion);}

/** Retry only the original capture; never reconstruct consent from customer data. */
export async function reconciliarSolicitudesMedicion(){
 const db=baseMedicion();if(!db||process.env.SG_ENTORNO!=='produccion')return;
 const {data,error}=await db.from('medicion_operaciones').select('tipo,operacion,idioma,contexto,excluir').in('tipo',['asesoria','empresa']).eq('conversion_registrada',false).eq('excluir',false).gt('creado_en',new Date(Date.now()-30*86400000).toISOString()).order('creado_en').limit(8);
 if(error)throw new Error('MEDICION_SOLICITUD_PENDIENTE');
 for(const m of data??[]){
  const c=m.contexto as ContextoPublicidad|null;
  await hitoNegocio('solicitud_recibida',`${m.tipo}:${m.operacion}`,m.idioma,c,false);
  if(c&&c.vence>Date.now())await encolarPublicidad(c,'Lead',idMedicion(`Lead:${m.tipo}:${m.operacion}`),m.tipo==='empresa'?'/empresas':'/contacto');
  const r=await db.from('medicion_operaciones').update({conversion_registrada:true}).eq('tipo',m.tipo).eq('operacion',m.operacion);if(r.error)throw new Error('MEDICION_SOLICITUD_PENDIENTE');
 }
}
