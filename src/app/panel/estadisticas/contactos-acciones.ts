'use server';
import {exigirAdminMfa} from '@/lib/acceso-panel';
import {baseMedicion} from '@/lib/medicion-servidor';
import {contactoComercial} from '@/lib/contactos-comerciales-modelo';
import {revalidatePath} from 'next/cache';
export async function guardarContactoComercial(_previo:string,form:FormData):Promise<string>{
 await exigirAdminMfa();
 const datos=contactoComercial.safeParse({id:form.get('id'),revision:Number(form.get('revision')),referencia:form.get('referencia'),fecha:form.get('fecha'),canal:form.get('canal'),fuente:form.get('fuente'),etapa:form.get('etapa'),prueba:form.get('prueba')==='on',confirmado:form.get('confirmado')==='on'});
 if(!datos.success)return 'invalido';
 const hoy=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica'}).format(new Date());
 if(datos.data.fecha>hoy||datos.data.fecha<'2026-01-01')return 'invalido';
 const db=baseMedicion();if(!db)return 'error';
 const {confirmado,id,revision,...campos}=datos.data;void confirmado;
 const entrada={...campos,revision:revision+1,actualizado_en:new Date().toISOString()};
 const r=revision===0?await db.from('contactos_comerciales').insert({id,...entrada}).select('id'):await db.from('contactos_comerciales').update(entrada).eq('id',id).eq('revision',revision).select('id');
 if(r.error)return r.error.code==='23505'?'duplicado':'error';
 if(!r.data?.length)return 'conflicto';
 revalidatePath('/panel/estadisticas');return 'guardado';
}
