import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
if(process.env.SG_PRODUCCION_SMOKE!=='1')throw new Error('Confirme el chequeo breve con SG_PRODUCCION_SMOKE=1. La regresión completa se ejecuta aislada.');
const origen='https://sgsolutionscr.com',resultados=[];
// Six read-only HTTP requests. No browser, analytics, accounts, emails or payments.
for(const idioma of ['es','en'])for(const ruta of ['/tienda','/favoritos']){
 const r=await fetch(origen+ruta,{headers:{cookie:`sg-idioma=${idioma}`},signal:AbortSignal.timeout(20000)});
 assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes(`<html lang="${idioma}"`));assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.ok(r.headers.get('content-security-policy')?.includes("object-src 'none'"));assert.ok(!html.includes('class="barra-local"'));resultados.push({ruta,idioma,status:r.status});
}
const c=await fetch(origen+'/api/catalogo',{signal:AbortSignal.timeout(20000)});assert.equal(c.status,200);const catalogo=await c.json();assert.ok(catalogo.productos.length>0);for(const p of catalogo.productos)for(const k of ['costoUsd','costoCrc','proveedor','eurocomp','password','apiKey'])assert.ok(!(k in p));resultados.push({ruta:'/api/catalogo',status:c.status});
const f=await fetch(origen+'/api/favoritos',{signal:AbortSignal.timeout(20000)});assert.equal(f.status,401);resultados.push({ruta:'/api/favoritos',status:f.status});
await mkdir('.privado/evidencias',{recursive:true});await writeFile('.privado/evidencias/produccion-smoke.json',JSON.stringify({fecha:new Date().toISOString(),peticiones:6,resultados},null,2));console.log('Producción: seis comprobaciones de solo lectura aprobadas.');
