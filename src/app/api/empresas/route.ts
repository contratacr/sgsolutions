import {leerTextoLimitado} from '@/lib/limites-http';
import {z} from 'zod';
import {getTranslations} from 'next-intl/server';
import {origenPermitido} from '@/lib/origen-permitido';
import {normalizarTelefonoWhatsApp} from '@/lib/telefono-whatsapp';
import {contactoSitio} from '@/lib/contacto-sitio-servidor';
import {enviarCorreo} from '@/lib/email/send';
const esquema=z.object({idioma:z.enum(['es','en']),plan:z.number().int().min(0).max(2),empresa:z.string().trim().min(2).max(120),nombre:z.string().trim().min(2).max(120),correo:z.email().max(254),telefono:z.string().max(25).transform(normalizarTelefonoWhatsApp).pipe(z.string()),equipos:z.enum(['1–5','6–15','16–30','31–50','51+']),mensaje:z.string().trim().min(2).max(1500),consentimiento:z.literal(true),sitio:z.string().max(200).default('')}).strict();
// Límite de ráfagas por instancia, además del control de origen y campo antispam.
const intentos=new Map<string,{cantidad:number;hasta:number}>();
export async function POST(request:Request){
 if(!origenPermitido(request))return Response.json({error:'origen'},{status:403});
 let datos:z.infer<typeof esquema>;
 try{const texto=await leerTextoLimitado(request,8000);if(texto.length>8000)throw new Error('limite');datos=esquema.parse(JSON.parse(texto));}catch{return Response.json({error:'datos'},{status:400});}
 if(datos.sitio)return Response.json({error:'datos'},{status:400});
 const ahora=Date.now();for(const [k,v] of intentos)if(v.hasta<=ahora)intentos.delete(k);
 const clave=request.headers.get('cf-connecting-ip')??datos.correo.toLowerCase();
 const intento=intentos.get(clave)??{cantidad:0,hasta:ahora+600000};
 if(intento.cantidad>=5)return Response.json({error:'limite'},{status:429,headers:{'Retry-After':'600'}});
 if(intentos.size>=5000)return Response.json({error:'limite'},{status:429});
 intentos.set(clave,{...intento,cantidad:intento.cantidad+1});
 try{
  const t=await getTranslations({locale:datos.idioma,namespace:'SolicitudPlan'}),planes=await getTranslations({locale:datos.idioma,namespace:'Inicio'});
  const {empresa}=await contactoSitio();
  const texto=[`${t('planElegido')}: ${planes(`plan${datos.plan}Nombre`)}`,...(['empresa','nombre','correo','telefono','equipos','mensaje'] as const).map(k=>`${t(k)}: ${datos[k]}`),t('consentimiento')].join('\n\n');
  await enviarCorreo({idioma:datos.idioma,diseno:{titulo:datos.idioma==='en'?'New business request':'Nueva solicitud de empresa',etiqueta:datos.idioma==='en'?'BUSINESS SERVICES':'SERVICIOS PARA EMPRESAS'},destinatario:empresa.correo,responderA:datos.correo,asunto:planes('planAsunto',{plan:planes(`plan${datos.plan}Nombre`)}),texto});
  return Response.json({enviado:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'no_disponible'},{status:503});}
}
