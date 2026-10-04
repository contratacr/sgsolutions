import {expect,test,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const creados=new Set<string>();
test.afterEach(async()=>{if(!creados.size)return;const archivo='.privado/admin-local/asesorias.json';const filas=JSON.parse(await readFile(archivo,'utf8'));await writeFile(archivo,JSON.stringify(filas.filter((s:{id:string})=>!creados.has(s.id))));creados.clear();});
export async function abrirCompraAprobada(page:Page,id='portatil',cantidad=1){
 test.skip(process.env.SG_TEST_ALTAS!=='1','La compra aprobada requiere servidor local aislado');
 const c=await (await page.request.get('/api/catalogo')).json();const producto=c.productos.find((p:{id:string})=>p.id===id);expect(producto).toBeTruthy();
 let filas=[];try{filas=JSON.parse(await readFile('.privado/admin-local/asesorias.json','utf8'));}catch{}
 const solicitud={id:crypto.randomUUID(),creado_en:new Date().toISOString(),estado:'aprobada',idioma:'es',articulos:[{producto,cantidad}],token:randomBytes(32).toString('hex'),vence_en:new Date(Date.now()+3600000).toISOString(),pedido_id:null};
 creados.add(solicitud.id);
 await writeFile('.privado/admin-local/asesorias.json',JSON.stringify([...filas,solicitud]),{mode:0o600});
 await page.goto(`/finalizar-compra?asesoria=${solicitud.id}&acceso=${solicitud.token}`);
}
