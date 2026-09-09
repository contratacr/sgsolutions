import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const archivos = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {encoding: 'utf8'}).split('\0').filter(Boolean);
const patrones = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\b(?:sk_live_|onvo_live_)[A-Za-z0-9_]{20,}\b/,
  /\bxkeysib-[A-Za-z0-9-]{30,}\b/,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,
  /(?:SERVICE_ROLE_KEY|SECRET_ACCESS_KEY|API_TOKEN|DATABASE_URL|DB_PASSWORD)\s*[:=]\s*["']?(?!\s|\$|process\.|env\.|secrets\.|\n)[A-Za-z0-9+/=_:.-]{16,}/
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
if (fallos.size) {
  // Reportar rutas únicamente: nunca mostrar el valor sospechoso.
  console.error('Posibles secretos en:\n'+[...fallos].join('\n'));
  process.exit(1);
}
console.log('Sin patrones de secretos en archivos versionables. Revisión heurística, no garantía absoluta.');
