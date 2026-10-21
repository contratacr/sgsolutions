import {conciliarTarjetas} from '@/lib/conciliacion-tarjeta';
import {timingSafeEqual} from 'node:crypto';
import {procesarPublicidad} from '@/lib/publicidad-servidor';
import {reconciliarPagosMedicion,reconciliarSolicitudesMedicion} from '@/lib/medicion-negocio';
import {procesarSolicitudesEmpresas} from '@/lib/solicitudes-empresa-servidor';
export const maxDuration=120;
export async function POST(request:Request){
 const clave=process.env.SG_MEDICION_PROCESADOR_SECRET,entrada=request.headers.get('authorization')??'';
 if(!clave||!/^[A-Za-z0-9_+/=-]{32,256}$/.test(clave))return new Response(null,{status:401});
 const recibido=Buffer.from(entrada),esperado=Buffer.from('Bearer '+clave);if(recibido.length!==esperado.length||!timingSafeEqual(recibido,esperado))return new Response(null,{status:401});
 try{await reconciliarSolicitudesMedicion();await reconciliarPagosMedicion();await procesarPublicidad();await procesarSolicitudesEmpresas();await conciliarTarjetas();return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});}catch{return new Response(null,{status:503});}
}
