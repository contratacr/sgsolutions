import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const privados=[];
const esPrivada=n=>!n.startsWith('NEXT_PUBLIC_')&&/(?:SERVICE_ROLE|SECRET|PASSWORD|API_KEY|API_TOKEN|DATABASE_URL|DB_PASSWORD)/.test(n);
for(const [n,v] of Object.entries(process.env))if(esPrivada(n)&&v&&v.length>=16)privados.push(v);
for(const archivo of ['.env.local','.dev.vars']){
 let texto='';try{texto=await readFile(archivo,'utf8');}catch{/* CI does not have local credentials. */}
 for(const linea of texto.split('\n')){const m=linea.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);if(m&&esPrivada(m[1])){const v=m[2].replace(/^(['"])(.*)\1$/,'$2');if(v.length>=16)privados.push(v);}}
}
const patrones=[/\b(?:sb_secret_|github_pat_|gh[pousr]_)[A-Za-z0-9_]{20,}/,/\bxkeysib-[A-Za-z0-9-]{30,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\b(?:sk_live_|onvo_live_|sk-proj-)[A-Za-z0-9_-]{20,}/,/\bAKIA[0-9A-Z]{16}\b/,/process\.env\.(?:SUPABASE_SERVICE_ROLE_KEY|BREVO_API_KEY|TILOPAY_API_KEY|TILOPAY_API_PASSWORD|EUROCOMP_PASSWORD)\b/];
const fallos=new Set();let revisados=0;
async function revisar(carpeta){
 let archivos;try{archivos=await readdir(carpeta,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}
 for(const entrada of archivos){const archivo=path.join(carpeta,entrada.name);if(entrada.isSymbolicLink()){fallos.add(archivo);continue;}if(entrada.isDirectory()){await revisar(archivo);continue;}
  if(!entrada.isFile())continue;revisados++;
  if(/(?:^|\/)(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?|.*\.(?:pem|key|p12|pfx))$/.test(archivo)){fallos.add(archivo);continue;}
  const bytes=await readFile(archivo);if(privados.some(v=>bytes.includes(Buffer.from(v)))){fallos.add(archivo);continue;}if(bytes.includes(0))continue;const texto=bytes.toString('utf8');
  if(patrones.some(p=>p.test(texto))||privados.some(v=>texto.includes(v))){fallos.add(archivo);continue;}
  for(const token of texto.matchAll(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g)){
   try{const payload=JSON.parse(Buffer.from(token[0].split('.')[1],'base64url'));if(payload.role!=='anon')fallos.add(archivo);}catch{fallos.add(archivo);}
  }
 }
}
for(const carpeta of process.argv.slice(2).length?process.argv.slice(2):['public','.next/static','.open-next/assets'])await revisar(carpeta);
if(!revisados)throw new Error('SIN_ARCHIVOS_PUBLICOS_PARA_REVISAR');
if(fallos.size){console.error('Posible exposición pública; se muestran rutas, nunca valores:\n'+[...fallos].join('\n'));process.exitCode=1;}
else console.log(`Archivos públicos revisados: ${revisados}. Sin coincidencias de credenciales privadas.`);
