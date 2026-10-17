import {test,expect} from '@playwright/test';
test('catálogo público no expone costos, credenciales ni configuración privada',async({request})=>{
 for(const ruta of ['/api/catalogo','/api/recomendaciones']){
  const r=await request.get(ruta);expect(r.status()).toBe(200);const datos=await r.json(),prohibidos:string[]=[];
  function revisar(v:unknown,camino=''){if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){if(/^(?:costoUsd|costoCrc|costo|ajustes|proveedor|token|service_role|apiKey|api_key|password|eurocomp)$/i.test(k))prohibidos.push(camino+'.'+k);revisar(x,camino+'.'+k);}}
  revisar(datos);expect(prohibidos).toEqual([]);
 }
});
test('APIs rechazan origen ajeno, cuerpos excesivos y acceso anónimo a favoritos',async({request,baseURL})=>{
 for(const ruta of ['/api/favoritos','/api/asesoria','/api/empresas','/api/compra/verificar','/api/pedidos/manual','/api/pagos/tilopay/iniciar']){
  expect((await request.post(ruta,{headers:{Origin:'https://example.com'},data:{}})).status()).toBe(403);
  const r=await request.post(ruta,{headers:{Origin:baseURL!,'Content-Type':'application/json'},data:'x'.repeat(13000)});expect([400,413]).toContain(r.status());
 }
 expect((await request.get('/api/favoritos')).status()).toBe(401);
 expect((await request.get('/api/mobile-preview')).status()).toBe(404);
 const r=await request.get('/tienda');expect(r.headers()['x-content-type-options']).toBe('nosniff');expect(r.headers()['content-security-policy']).toContain("object-src 'none'");
});
