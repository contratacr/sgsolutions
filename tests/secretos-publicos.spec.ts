import {test,expect} from '@playwright/test';
import {mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
test('el control público bloquea credenciales sin imprimir sus valores',async()=>{
 await mkdir(path.join(process.cwd(),'.privado'),{recursive:true});
 const carpeta=await mkdtemp(path.join(process.cwd(),'.privado/publico-qa-'));
 try{
  await writeFile(path.join(carpeta,'app.js'),'const color="azul";');
  expect(execFileSync(process.execPath,['scripts/verificar-publico.mjs',carpeta],{encoding:'utf8'})).toContain('Sin coincidencias');
  const secreto=['sb','secret','a'.repeat(40)].join('_');await writeFile(path.join(carpeta,'app.js'),`const dato="${secreto}";`);
  let salida='';try{execFileSync(process.execPath,['scripts/verificar-publico.mjs',carpeta],{encoding:'utf8',stdio:'pipe'});throw new Error('NO_BLOQUEO');}catch(e){const error=e as {status?:number;stderr?:string};expect(error.status).toBe(1);salida=String(error.stderr);}
  expect(salida).toContain('app.js');expect(salida).not.toContain(secreto);
 }finally{await rm(carpeta,{recursive:true,force:true});}
});
