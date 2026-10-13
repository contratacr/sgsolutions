import 'server-only';
import {leerContenido} from './contenido-servidor';
import {enlaceWhatsApp as whatsapp,enlaceCorreo as correo} from './empresa';
export async function contactoSitio(){const {contacto,imagenes}=await leerContenido();return {empresa:contacto,imagenes,enlaceWhatsApp:(mensaje:string)=>whatsapp(mensaje,contacto),enlaceCorreo:(asunto='',cuerpo='')=>correo(asunto,cuerpo,contacto)};}
