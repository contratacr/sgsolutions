// Descubrimiento, no ejecución: Playwright --list no inicia los webServer.
import {execFileSync} from 'node:child_process';
import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {bloques} from './bloques.mjs';
const archivos=(await readdir('tests')).filter(n=>n.endsWith('.spec.ts'));
const encontrados=new Map(),errores=[];
for(const [nombre,[bin,...args]] of bloques){
 if(bin!=='npx')continue;
 try{
  const salida=execFileSync('npx',['playwright','test',args.find(a=>a.startsWith('--config=')),'--list','--reporter=json'],{encoding:'utf8',maxBuffer:16*1024*1024,timeout:60000,env:{...process.env,SG_ENTORNO:'local',SG_PRUEBAS_INTEGRACION:'1'}});
  const reporte=JSON.parse(salida);
  if(reporte.errors?.length)throw new Error('Errores de descubrimiento');
  function recorrer(suites){for(const suite of suites??[]){for(const spec of suite.specs??[]){const archivo=spec.file.split('/').at(-1);const lista=encontrados.get(archivo)??new Set();lista.add(nombre);encontrados.set(archivo,lista);}recorrer(suite.suites);}}
  recorrer(reporte.suites);
 }catch{errores.push(nombre);}
}
const inventario=await Promise.all(archivos.map(async archivo=>({archivo:'tests/'+archivo,bloques:[...(encontrados.get(archivo)??[])],requiereRevisarOmisiones:/\btest\.(skip|fixme)\s*\(/.test(await readFile('tests/'+archivo,'utf8'))})));
await mkdir('.privado/evidencias',{recursive:true});
await writeFile('.privado/evidencias/inventario-testing.json',JSON.stringify({advertencia:'Descubrimiento no equivale a ejecución o cobertura de líneas. Los skip condicionales requieren el entorno adecuado.',errores,inventario},null,2));
console.log(JSON.stringify({archivos:archivos.length,conBloque:inventario.filter(f=>f.bloques.length).length,sinBloque:inventario.filter(f=>!f.bloques.length).map(f=>f.archivo),errores},null,2));
if(errores.length)process.exitCode=1;
