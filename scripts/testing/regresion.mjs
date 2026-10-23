import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {bloques} from './bloques.mjs';
import {entornoAislado} from './entorno-aislado.mjs';
const seleccion=process.argv.slice(2);
if(seleccion.includes('--list')){console.log(JSON.stringify(bloques.map(([nombre,comando])=>({nombre,comando})),null,2));process.exit(0);}
if(seleccion.some(n=>!bloques.some(([nombre])=>nombre===n))){console.error('Bloques disponibles:',bloques.map(([n])=>n).join(', '));process.exit(2);}
// Fresh CI checkouts do not contain the ignored local catalogue snapshot.
execFileSync(process.execPath,['scripts/preparar-catalogo.mjs'],{stdio:'inherit'});
const carpeta=resolve('.privado/regresion',new Date().toISOString().replaceAll(':','-'));
await mkdir(carpeta,{recursive:true});
const resultados=[];
const usaNext=bloques.some(([n,[bin]])=>(!seleccion.length||seleccion.includes(n))&&(bin==='npx'||n==='build'));
const previo=usaNext?await readFile('next-env.d.ts','utf8'):null;
try{
 for(const [nombre,[bin,...args]] of bloques.filter(([n])=>!seleccion.length||seleccion.includes(n))){
  console.log(`\nRegresión: ${nombre}`);
  const inicio=Date.now();let log='';
  const codigo=await new Promise((done)=>{
   const argumentos=bin==='npx'?[...args,'--output',resolve('test-results',nombre)]:args;
   const hijo=spawn(bin,argumentos,{stdio:['ignore','pipe','pipe'],env:{...process.env,...entornoAislado,
    PLAYWRIGHT_HTML_OUTPUT_DIR:resolve(carpeta,nombre+'-html'),
    PLAYWRIGHT_JSON_OUTPUT_NAME:resolve(carpeta,nombre+'.json'),
    ...(bin==='npx'?{PLAYWRIGHT_HTML_OPEN:'never'}:{}),
   }});
   hijo.stdout.on('data',b=>{process.stdout.write(b);log+=b});hijo.stderr.on('data',b=>{process.stderr.write(b);log+=b});
   hijo.on('error',e=>{log+=e.message;done(1)});hijo.on('close',c=>done(c??1));
  });
  await writeFile(resolve(carpeta,nombre+'.log'),log);
  let pruebas;
  try{pruebas=JSON.parse(await readFile(resolve(carpeta,nombre+'.json'),'utf8')).stats;}catch{}
  resultados.push({bloque:nombre,codigo,segundos:Math.round((Date.now()-inicio)/1000),...(pruebas?{aprobadas:pruebas.expected,fallidas:pruebas.unexpected,omitidas:pruebas.skipped,inestables:pruebas.flaky}:{})});
  await writeFile(resolve(carpeta,'resumen.json'),JSON.stringify(resultados,null,2));
 }
}finally{if(previo!==null)await writeFile('next-env.d.ts',previo);}
console.table(resultados);console.log('Reportes:',carpeta);
process.exitCode=resultados.some(r=>r.codigo!==0)?1:0;
