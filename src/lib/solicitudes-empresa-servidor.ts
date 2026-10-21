import 'server-only';
import {getTranslations} from 'next-intl/server';
import {baseMedicion} from './medicion-servidor';
import {enviarCorreo} from './email/send';
import {contactoSitio} from './contacto-sitio-servidor';
export async function notificarSolicitudEmpresa(id:string){
 const db=baseMedicion();if(!db)return;
 const {data,error}=await db.rpc('reservar_solicitud_empresa',{identificador:id});if(error||!data?.length)return;
 const s=data[0],d=s.datos,idioma=s.idioma as 'es'|'en';let exito=false;
 try{const t=await getTranslations({locale:idioma,namespace:'SolicitudPlan'}),planes=await getTranslations({locale:idioma,namespace:'Inicio'}),{empresa}=await contactoSitio();
  await enviarCorreo({idioma,destinatario:empresa.correo,responderA:d.correo,asunto:planes('planAsunto',{plan:planes(`plan${s.plan}Nombre`)}),diseno:{titulo:idioma==='en'?'New business request':'Nueva solicitud de empresa',referencia:id},texto:[`${t('planElegido')}: ${planes(`plan${s.plan}Nombre`)}`,...(['empresa','nombre','correo','telefono','equipos','mensaje'] as const).map(k=>`${t(k)}: ${d[k]}`),t('consentimiento')].join('\n\n')});exito=true;
 }catch{/* The durable inbox and bounded retry preserve the actual request. */}
 await db.from('solicitudes_empresas').update({estado:exito?'notificada':'recibida',proximo_en:new Date(Date.now()+Math.min(3600000,60000*2**s.intentos)).toISOString()}).eq('id',id).eq('estado','notificando').eq('reservado_en',s.reservado_en);
}
export async function procesarSolicitudesEmpresas(){const db=baseMedicion();if(!db)return;const {data}=await db.from('solicitudes_empresas').select('id').in('estado',['recibida','notificando']).lt('intentos',5).lte('proximo_en',new Date().toISOString()).order('creado_en').limit(4);for(const s of data??[])await notificarSolicitudEmpresa(s.id);}
