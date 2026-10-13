import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';import {randomBytes,createHash} from 'node:crypto';
export default async function preparar(){
 const carpeta='.privado/contenido-pruebas';await rm(carpeta,{recursive:true,force:true});await mkdir(carpeta,{recursive:true,mode:0o700});
 const token=randomBytes(32).toString('hex');await writeFile(carpeta+'/cuenta.json',JSON.stringify({correo:'admin-fixture@example.com',salt:'fixture',hash:'fixture',intentos:0,bloqueadoHasta:0,sesiones:[{hash:createHash('sha256').update(token).digest('hex'),vence:Date.now()+600000}]}),{mode:0o600});await writeFile(carpeta+'/sesion.json',JSON.stringify({token}),{mode:0o600});
 await writeFile(carpeta+'/contenido.json',JSON.stringify({contenido:JSON.parse(await readFile('src/lib/contenido-base.json','utf8')),revision:1}),{mode:0o600});
}
