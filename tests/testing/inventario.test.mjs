import {test} from 'node:test';
import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';
import {bloques} from '../../scripts/testing/bloques.mjs';

test('cada bloque tiene un ejecutable existente y un nombre único',async()=>{
 assert.equal(new Set(bloques.map(([n])=>n)).size,bloques.length);
 for(const [,comando] of bloques){
  for(const arg of comando){
   if(arg.startsWith('--config='))await access(arg.slice(9));
   else if(arg.startsWith('tests/'))await access(arg);
  }
 }
});
test('las regresiones críticas recientes están conectadas al workflow manual',async()=>{
 const workflow=await readFile('.github/workflows/pruebas-compras.yml','utf8');
 for(const nombre of ['revision-tienda','conciliacion','privacidad','exclusion-admin','mfa-clientes','software','referencias','plazo-panel','integracion-campanas-contrato','integracion-campanas-transporte','integracion-conciliacion-tarjeta','integracion-plazo-correos','integracion-retiro-pago','sql-conciliacion-tarjeta','sql-campanas-conversiones']){
  assert.ok(bloques.some(([n])=>n===nombre),nombre+' no registrado');
  assert.ok(workflow.includes(nombre),nombre+' ausente de CI manual');
 }
 assert.match(workflow,/pruebas:\s+if: github.event_name == 'workflow_dispatch'/);
 assert.match(workflow,/worker:\s+if: github.event_name == 'workflow_dispatch'/);
});
test('la regresión aislada no incorpora diagnósticos de producción ni Meta real',()=>{
 for(const [nombre,comando] of bloques){
  assert.doesNotMatch(nombre+' '+comando.join(' '),/meta-prueba-cola|produccion-smoke|mfa-auth/);
 }
});

test('los casos retirados tienen motivo y reemplazos existentes',async()=>{
 const legado=JSON.parse(await readFile('tests/legado/inventario.json','utf8'));
 for(const [nombre,registro] of Object.entries(legado)){
  assert.ok(registro.motivo.length>20);assert.ok(registro.reemplazos.length);
  await access('tests/legado/'+nombre+'.txt');
  for(const reemplazo of registro.reemplazos)await access(reemplazo);
 }
});
