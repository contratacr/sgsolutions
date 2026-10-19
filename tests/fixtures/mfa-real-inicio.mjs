import {createClient} from '@supabase/supabase-js';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {randomBytes} from 'node:crypto';import assert from 'node:assert/strict';
export default async function preparar(){
 const cfg=JSON.parse(await readFile(process.env.TEST_SUPABASE_CONFIG,'utf8'));const url=cfg.API_URL,service=cfg.SERVICE_ROLE_KEY;assert.ok(['127.0.0.1','localhost'].includes(new URL(url).hostname),'Solo Supabase aislado local');
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}}),usuarios={};
 for(const nombre of ['es-desktop','en-desktop','es-safari-mobile','en-safari-mobile','cliente']){
  const email='mfa-'+nombre+'-'+randomBytes(4).toString('hex')+'@example.test',password='Qa!Mfa-9'+randomBytes(15).toString('hex');const creado=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{nombre_completo:'MFA '+nombre,rol:'administrador',aal:'aal2'}});assert.equal(creado.error,null);
  const id=creado.data.user.id;if(nombre!=='cliente'){const p=await db.from('perfiles').insert({id,nombre:'MFA '+nombre,rol:'administrador',activo:true});assert.equal(p.error,null);}
  usuarios[nombre]={email,password,id};
 }
 await mkdir('.privado/mfa-real',{recursive:true,mode:0o700});await writeFile('.privado/mfa-real/usuarios.json',JSON.stringify(usuarios),{mode:0o600});
}
