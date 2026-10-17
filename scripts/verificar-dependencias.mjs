import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
let salida;
try{salida=execFileSync('npm',['audit','--json'],{encoding:'utf8',stdio:'pipe'});}catch(e){if(!e.stdout)throw e;salida=String(e.stdout);}
const reporte=JSON.parse(salida);if(reporte.error)throw new Error('AUDITORIA_NO_DISPONIBLE');
mkdirSync('.privado/evidencias',{recursive:true});writeFileSync('.privado/evidencias/dependencias.json',JSON.stringify(reporte,null,2));
const avisos=new Map();for(const v of Object.values(reporte.vulnerabilities??{}))for(const a of v.via)if(typeof a==='object')avisos.set(a.url,a);
// Development tooling only, no fix published. Never suppress unrelated advisories.
const conocida='https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';
for(const [url,a] of avisos){
 if(url===conocida)console.warn(`${process.env.CI?'::warning::':''}Alerta pendiente de braces en herramientas de desarrollo, sin parche: ${url}`);
 else if(['high','critical'].includes(a.severity)){console.error('Dependencia con alerta nueva:',a.name,a.severity,url);process.exitCode=1;}
 else console.warn('Alerta de dependencia:',a.name,a.severity,url);
}
console.log(`Auditoría completa: ${avisos.size} avisos distintos. El control de producción se ejecuta por separado y no admite excepciones.`);
