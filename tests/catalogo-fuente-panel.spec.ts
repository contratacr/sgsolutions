import {test,expect} from '@playwright/test';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import inicial from '../src/lib/catalogo-inicial.json';
const archivo='.privado/contenido-pruebas/catalogo.json';
test.afterEach(async()=>{await unlink(archivo).catch(()=>{});});
for(const idioma of ['es','en'])test(`panel y tienda excluyen manuales e Intcomex ${idioma}`,async({page,context})=>{
 const api=structuredClone(inicial.productos.find(p=>p.eurocomp&&p.eurocomp.stock>=15&&p.publicado)!);
 const manual={...api,id:'manual-antiguo',codigoEurocomp:undefined,eurocomp:undefined,nombre:{es:'Manual prohibido',en:'Forbidden manual'}};
 const ic={...manual,id:'ic-antiguo',codigoIntcomex:'IC-1',nombre:{es:'Intcomex antiguo',en:'Legacy Intcomex'}};
 await writeFile(archivo,JSON.stringify({contenido:{...inicial,productos:[api,manual,ic]},revision:1}),{mode:0o600});
 const {token}=JSON.parse(await readFile('.privado/contenido-pruebas/sesion.json','utf8'));
 await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/panel/catalogo');await expect(page.locator('main:visible .admin-producto-fila')).toHaveCount(1);await expect(page.locator('main:visible .admin-lista-cabecera button')).toHaveCount(0);
 await expect(page.locator('main:visible')).not.toContainText(/Manual prohibido|Forbidden manual|Intcomex antiguo|Legacy Intcomex/);
 await page.goto('/tienda');await expect(page.locator('.shop-producto')).toHaveCount(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',idioma);
});
