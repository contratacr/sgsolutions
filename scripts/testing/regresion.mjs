import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const bloques=[
 ['verificar',['npm','run','verificar']],
 ['build',['npm','run','build']],
 ...['cuenta-panel','eurocomp','disponibilidad','fondos','inicio-movil','modales','pedidos-propuesta','checkout-pasos','correos-diseno','mobile-preview','regresion','comprobantes','catalogo','tilopay-hosted','empresas-correo','entrega','confirmaciones','contenido','google','codigo','estadisticas','eurocomp-manual'].map(nombre=>[nombre,['npx','playwright','test','--reporter=list,json,html',`--config=playwright.${nombre}.config.ts`]]),
];
const seleccion=process.argv.slice(2);
if(seleccion.some(n=>!bloques.some(([nombre])=>nombre===n))){console.error('Bloques disponibles:',bloques.map(([n])=>n).join(', '));process.exit(2);}
// Fresh CI checkouts do not contain the ignored local catalogue snapshot.
execFileSync(process.execPath,['scripts/preparar-catalogo.mjs'],{stdio:'inherit'});
const carpeta=resolve('.privado/regresion',new Date().toISOString().replaceAll(':','-'));
await mkdir(carpeta,{recursive:true});
const resultados=[];
const previo=await readFile('next-env.d.ts','utf8');
try{
 for(const [nombre,[bin,...args]] of bloques.filter(([n])=>!seleccion.length||seleccion.includes(n))){
  console.log(`\nRegresión: ${nombre}`);
  const inicio=Date.now();let log='';
  const codigo=await new Promise((done)=>{
   const argumentos=bin==='npx'?[...args,'--output',resolve(carpeta,nombre+'-resultados')]:args;
   const hijo=spawn(bin,argumentos,{stdio:['ignore','pipe','pipe'],env:{...process.env,
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
}finally{await writeFile('next-env.d.ts',previo);}
console.table(resultados);console.log('Reportes:',carpeta);
process.exitCode=resultados.some(r=>r.codigo!==0)?1:0;
