import 'server-only';
import {cookies,headers} from 'next/headers';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';

const carpeta=path.join(process.cwd(),'.privado','admin-local');
const cookie='sg-admin-local';
type Cuenta={correo:string;salt:string;hash:string;intentos:number;bloqueadoHasta:number;sesiones:{hash:string;vence:number}[]};
export async function adminLocalDisponible(){
 if(process.env.NODE_ENV!=='development'||process.env.SG_ADMIN_LOCAL!=='1'||process.env.SG_ENTORNO==='produccion')return false;
 const host=(await headers()).get('host')??'';
 return /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
}
async function cuenta():Promise<Cuenta>{return JSON.parse(await readFile(path.join(carpeta,'cuenta.json'),'utf8'));}
async function escribir(nombre:string,valor:unknown){
 await mkdir(carpeta,{recursive:true,mode:0o700});
 const destino=path.join(carpeta,nombre+'.json');
 const temporal=destino+'.'+randomBytes(8).toString('hex');
 await writeFile(temporal,JSON.stringify(valor),{mode:0o600});await rename(temporal,destino);
}
const hashToken=(token:string)=>createHash('sha256').update(token).digest('hex');
let cola=Promise.resolve();
async function exclusivo<T>(operacion:()=>Promise<T>):Promise<T>{const anterior=cola;let liberar!:()=>void;cola=new Promise<void>(r=>{liberar=r;});await anterior;try{return await operacion();}finally{liberar();}}
export async function iniciarLocal(correo:string,clave:string){
 if(!await adminLocalDisponible())return false;
 return exclusivo(async()=>{
 const c=await cuenta();if(c.bloqueadoHasta>Date.now())return false;
 const valido=timingSafeEqual(scryptSync(clave,c.salt,64),Buffer.from(c.hash,'hex'))&&correo.toLowerCase()===c.correo;
 if(!valido){c.intentos++;if(c.intentos>=5){c.bloqueadoHasta=Date.now()+5*60_000;c.intentos=0;}await escribir('cuenta',c);return false;}
 const token=randomBytes(32).toString('hex');c.intentos=0;c.bloqueadoHasta=0;c.sesiones=c.sesiones.filter(s=>s.vence>Date.now());c.sesiones.push({hash:hashToken(token),vence:Date.now()+8*3600_000});await escribir('cuenta',c);
 (await cookies()).set(cookie,token,{httpOnly:true,sameSite:'strict',path:'/',maxAge:8*3600});return true;
 });
}
export async function sesionLocal(){
 if(!await adminLocalDisponible())return null;
 const token=(await cookies()).get(cookie)?.value;if(!token)return null;
 const c=await cuenta();return c.sesiones.some(s=>s.hash===hashToken(token)&&s.vence>Date.now())?{correo:c.correo,rol:'administrador'}:null;
}
export async function salirLocal(){
 if(!await adminLocalDisponible())return;
 await exclusivo(async()=>{const token=(await cookies()).get(cookie)?.value;const c=await cuenta();c.sesiones=c.sesiones.filter(s=>s.hash!==hashToken(token??''));await escribir('cuenta',c);(await cookies()).delete(cookie);});
}
export async function leerLocal<T>(nombre:'catalogo'|'contenido'):Promise<{contenido:T;revision:number}|null>{
 if(!await adminLocalDisponible())return null;
 try{return JSON.parse(await readFile(path.join(carpeta,nombre+'.json'),'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}
}
export async function guardarLocal(nombre:'catalogo'|'contenido',contenido:unknown,revision:number):Promise<{error?:string;revision?:number}>{
 if(!await sesionLocal())return {error:'sinPermiso'};
 return exclusivo(async()=>{const actual=await leerLocal(nombre);if((actual?.revision??0)!==revision)return {error:'conflicto'};await escribir(nombre,{contenido,revision:revision+1});return {revision:revision+1};});
}
