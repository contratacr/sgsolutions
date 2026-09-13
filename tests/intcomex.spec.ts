import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';
import {autorizacionIws,consultarIws} from '../src/lib/intcomex/cliente';
import {asignarCategoria,combinarIws,fusionarProveedor,type FilaProveedor} from '../src/lib/intcomex/catalogo';
import {esquemaCatalogo,publicarCatalogo,calcularPrecio} from '../src/lib/catalogo-modelo';
import {consultarCatalogo} from '../src/lib/catalogo-consulta';
import base from '../src/lib/catalogo-base.json';
const fila:FilaProveedor={sku:'prueba-1',mpn:'MODELO-1',marca:'Marca de prueba',nombreEs:'Equipo de prueba',nombreEn:'Test device',categoria:'computo',costo:100,moneda:'USD',stock:20,stockExacto:false,tipo:'Physical',imagen:''};
const fecha='2026-09-13T10:00:00.000Z';

test('importación idempotente y cambios propios protegidos',()=>{
 const original=esquemaCatalogo.parse({...base,productos:[]});
 const primera=fusionarProveedor(original,[fila],fecha);
 expect(primera.informe.nuevos).toBe(1);
 const producto=primera.catalogo.productos[0];
 producto.nombre.es='Texto propio';producto.categoria='redes';producto.precioManual=99000;
 const segunda=fusionarProveedor(primera.catalogo,[{...fila,costo:120}],fecha);
 expect(segunda.catalogo.productos).toHaveLength(1);
 expect(segunda.catalogo.productos[0]).toMatchObject({nombre:{es:'Texto propio'},categoria:'redes',precioManual:99000,costoUsd:120});
 expect(publicarCatalogo(segunda.catalogo).productos[0].precio).toBe(99000);
 expect(()=>fusionarProveedor(original,[fila,fila],fecha)).toThrow('IWS_SKU_DUPLICADO');
 expect(fusionarProveedor(original,[fila,{...fila,sku:'variante-2'}],fecha).catalogo.productos).toHaveLength(2);
 expect(fusionarProveedor(primera.catalogo,[],fecha).catalogo.productos).toHaveLength(1);
});

test('saltos de costo se revisan, colones no se convierten y DTO no filtra costos',()=>{
 const original=esquemaCatalogo.parse({...base,productos:[]});
 const primera=fusionarProveedor(original,[fila],fecha).catalogo;
 const segunda=fusionarProveedor(primera,[{...fila,costo:200}],fecha).catalogo;
 expect(segunda.productos[0].revisionPrecio).toBe(true);
 expect(segunda.productos[0].costoUsd).toBe(100);
 expect(publicarCatalogo(segunda).productos[0].precio).toBeNull();
 const crc=fusionarProveedor(original,[{...fila,moneda:'CRC',costo:10000,stock:0}],fecha).catalogo;
 expect(publicarCatalogo(crc).productos[0]).toMatchObject({precio:calcularPrecio(null,crc.ajustes,null,10000),disponibilidad:'agotado'});
 expect(JSON.stringify(publicarCatalogo(crc))).not.toMatch(/"(?:sku|costo|costoUsd|costoCrc|precioManual|revisionPrecio|ajustes)"/);
 const esd=fusionarProveedor(original,[{...fila,stock:0,tipo:'Downloadable'}],fecha).catalogo;
 expect(publicarCatalogo(esd).productos[0].disponibilidad).toBe('consultar');
});

test('mapeo de todas las categorías y validación de respuesta IWS',()=>{
 for(const [codigo,categoria] of Object.entries({cpt:'computo',net:'redes',vis:'seguridad',cac:'accesorios',prt:'oficina',pos:'punto-de-venta',sfw:'software',gam:'gaming',mnt:'componentes'}))expect(asignarCategoria(codigo,'Producto')).toBe(categoria);
 expect(asignarCategoria('app','Refrigerador')).toBeNull();
 const es=[{Sku:'A',Mpn:'MPN',Brand:{Description:'Marca'},Description:'Equipo',Category:{CategoryId:'net.router'},Type:'Physical'}];
 const en=[{...es[0],Description:'Device'}],precios=[{Sku:'A',Price:{UnitPrice:100,CurrencyId:'US'}}],stock=[{Sku:'A',InStock:'25',RealStockValue:false}];
 expect(combinarIws(es,en,precios,stock).filas[0]).toMatchObject({categoria:'redes',moneda:'USD',nombreEn:'Device',stock:25,stockExacto:false});
 expect(()=>combinarIws(es,en,[{Sku:'A',Price:{UnitPrice:100,CurrencyId:'EUR'}}],stock)).toThrow('IWS_MONEDA_NO_RECONOCIDA');
 expect(combinarIws(es,en,[],stock).filas).toHaveLength(0);
});

test('autenticación firmada y fallos de proveedor sin datos parciales',async()=>{
 const cred={apiKey:'test-key',accessKey:'private-test-value',ambiente:'test' as const};
 const firma=createHash('sha256').update('test-key,private-test-value,2026-09-13T10:00:00Z').digest('hex');
 expect(autorizacionIws(cred,new Date(fecha))).toBe(`Bearer apiKey=test-key&utcTimeStamp=2026-09-13T10:00:00Z&signature=${firma}`);
 const transporte:typeof fetch=async(url,init)=>{expect(String(url)).not.toContain('test-key');expect(init?.redirect).toBe('error');return new Response(JSON.stringify([{Sku:'A'}]),{status:200});};
 expect(await consultarIws(cred,'getcatalog','es',transporte)).toHaveLength(1);
 await expect(consultarIws(cred,'getcatalog','es',async()=>new Response('{}',{status:401}))).rejects.toThrow('IWS_HTTP_401');
 await expect(consultarIws(cred,'getcatalog','es',async()=>Response.json([{data:[],totalPages:4}]))).rejects.toThrow('IWS_RESPUESTA_INCOMPLETA');
});

test('servidor pagina y busca el catálogo completo sin exponer datos privados',async({request})=>{
 const publico=publicarCatalogo(esquemaCatalogo.parse(base));
 const pagina=consultarCatalogo(publico,new URLSearchParams('pagina=999999'));
 expect(pagina.pagina).toBe(pagina.paginas);
 expect(pagina.productos.length).toBeLessThanOrEqual(24);
 const response=await request.get('/api/catalogo?pagina=2');expect(response.ok()).toBe(true);
 const datos=await response.json();expect(datos.productos).toHaveLength(24);expect(datos.total).toBe(publico.productos.length);
 expect(JSON.stringify(datos)).not.toMatch(/"(?:costo|costoUsd|sku|precioManual)"/);
 expect((await request.get('/api/catalogo?ids=INVALID!')).status()).toBe(400);
});

test('páginas, búsqueda de MPN y carrito funcionan en ES y EN',async({page},info)=>{
 await page.goto('/tienda');
 await expect(page.locator('.shop-producto')).toHaveCount(24);
 const primero=await page.locator('.shop-producto h3').first().textContent();
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();
 await expect(page.getByRole('navigation',{name:'Páginas del catálogo'})).toContainText('Página 2');
 await expect(page.locator('.shop-producto h3').first()).not.toHaveText(primero!);
 await page.locator('#buscar-equipo').fill('GY51P14335');
 await expect(page.locator('.shop-producto')).toHaveCount(1);
 await page.locator('.shop-producto').getByRole('button').click();
 await page.reload();
 await page.getByRole('button',{name:'Abrir carrito'}).click();
 await expect(page.locator('.carrito-lineas')).toContainText('GY51P14335');
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Read this page in English'}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await page.locator('#buscar-equipo').fill('GY51P14335');
 await expect(page.locator('.shop-producto')).toHaveCount(1);
 await expect(page.locator('.shop-producto')).toContainText('Manufacturer code');
 await expect(page.locator('.shop-producto')).toContainText('Available from supplier');
 await page.locator('.shop-resultados').scrollIntoViewIfNeeded();
 await page.screenshot({path:`evidencias/catalogo-importado-${info.project.name}.png`,animations:'disabled'});
});
