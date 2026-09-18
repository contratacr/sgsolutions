import {randomBytes,scryptSync} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
const correo=process.argv[2]?.trim().toLowerCase();
if(!correo||!correo.includes('@'))throw new Error('Indique el correo del administrador local.');
const clave=randomBytes(18).toString('base64url');
const salt=randomBytes(32).toString('hex');
await mkdir('.privado/admin-local',{recursive:true,mode:0o700});
await writeFile('.privado/admin-local/cuenta.json',JSON.stringify({correo,salt,hash:scryptSync(clave,salt,64).toString('hex'),intentos:0,bloqueadoHasta:0,sesiones:[]}),{flag:'wx',mode:0o600});
console.log(`Administrador local: ${correo}\nContraseña: ${clave}`);
