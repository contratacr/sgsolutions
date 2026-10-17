import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const archivos = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {encoding: 'utf8'}).split('\0').filter(Boolean);
const patrones = [
  /\b(?:sb_secret_|github_pat_)[A-Za-z0-9_]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bsk-proj-[A-Za-z0-9_-]{20,}\b/,
  /\bsirett_(?:cli|prv|sys)_[a-fA-F0-9]{48}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\b(?:sk_live_|onvo_live_)[A-Za-z0-9_]{20,}\b/,
  /\bxkeysib-[A-Za-z0-9-]{30,}\b/,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,
  /(?:SERVICE_ROLE_KEY|SECRET_ACCESS_KEY|API_TOKEN|API_KEY|DATABASE_URL|DB_PASSWORD|API_PASSWORD|SMTP_PASSWORD|EUROCOMP_PASSWORD)[ \t]*[:=][ \t]*["']?(?!\s|\$|process\.|env\.|secrets\.|\n)[A-Za-z0-9+/=_:.-]{16,}/
];
const fallos = new Set();
for (const archivo of archivos) {
  if (!fs.existsSync(archivo) || !fs.statSync(archivo).isFile()) continue;
  if (/(^|\/)\.env(?!\.example$)|\.(p12|pem|pfx|key)$/.test(archivo)) { fallos.add(archivo); continue; }
  const bytes = fs.readFileSync(archivo);
  if (bytes.includes(0)) continue;
  const texto = bytes.toString('utf8');
  if (patrones.some(p => p.test(texto))) fallos.add(archivo);
}
if(process.argv.includes('--historial')){
 const objetos=execFileSync('git',['rev-list','--objects','--all'],{encoding:'utf8'}).trim().split('\n').map(l=>{const i=l.indexOf(' ');return {hash:l.slice(0,i),ruta:l.slice(i+1)};}).filter(o=>o.hash&&/\.(?:tsx?|m?js|json|ya?ml|md|sh|sql|toml|html|css|txt|env|example)$/.test(o.ruta));
 const datos=execFileSync('git',['cat-file','--batch'],{input:objetos.map(o=>o.hash).join('\n')+'\n',maxBuffer:256*1024*1024});
 let posicion=0;
 for(const objeto of objetos){const fin=datos.indexOf(10,posicion),cabecera=datos.subarray(posicion,fin).toString('utf8').split(' '),tamano=Number(cabecera[2]);if(!Number.isSafeInteger(tamano))throw new Error('HISTORIAL_NO_LEGIBLE');const bytes=datos.subarray(fin+1,fin+1+tamano);posicion=fin+tamano+2;if(!bytes.includes(0)&&patrones.some(p=>p.test(bytes.toString('utf8'))))fallos.add('historial:'+objeto.ruta);}
 console.log(`Versiones históricas de texto revisadas: ${objetos.length}.`);
}
if (fallos.size) {
  // Reportar rutas únicamente: nunca mostrar el valor sospechoso.
  console.error('Posibles secretos en:\n'+[...fallos].join('\n'));
  process.exit(1);
}
console.log('Sin patrones de secretos en archivos versionables. Revisión heurística, no garantía absoluta.');
