import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const editables='input:not([type=hidden],[type=checkbox],[type=radio],[type=range],[type=file],[type=button],[type=submit],[type=reset],[type=image],[type=color]),textarea,select,[contenteditable=true]';
async function verificarCampos(page:Page,movil:boolean){
 const campos=await page.locator(editables).evaluateAll(es=>es.filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';}).map(e=>({nombre:(e as HTMLInputElement).name||e.id||e.tagName,tamano:parseFloat(getComputedStyle(e).fontSize)})));
 if(movil)expect(campos.filter(c=>c.tamano<16),JSON.stringify(campos)).toEqual([]);
 return campos;
}
for(const idioma of ['es','en'])test(`campos públicos y panel en ${idioma}`,async({page,context},info)=>{
 const movil=info.project.name==='safari-mobile';
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 for(const ruta of ['/tienda','/contacto','/soporte','/acceso','/cuenta','/cuenta/recuperar','/admin']){
  await page.goto(ruta);await expect(page.locator('main')).toBeVisible();await expect(page.locator('html')).toHaveAttribute('lang',idioma);
  await verificarCampos(page,movil);
  if(movil){const viewport=await page.locator('meta[name=viewport]').getAttribute('content');expect(viewport).not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0)?(?:,|$)/i);}
 }
 await page.goto('/empresas');await page.locator('#planes .plan button').first().click();
 const formulario=page.locator('.solicitud-dialog form');await expect(formulario).toBeVisible();
 const campos=await verificarCampos(page,movil);expect(campos.length).toBeGreaterThanOrEqual(6);
 const telefono=formulario.locator('input[type=tel]');const escalaAntes=await page.evaluate(()=>window.visualViewport?.scale);await telefono.focus();await telefono.fill('88888888');await expect(telefono).toHaveValue('88888888');if(movil)expect(await page.evaluate(()=>window.visualViewport?.scale)).toBe(escalaAntes);
 if(!movil)expect(parseFloat(await telefono.evaluate(e=>getComputedStyle(e).fontSize))).toBeLessThan(16);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:`.privado/zoom-campos-empresa-${info.project.name}-${idioma}.png`});
 await page.goto('/tienda');const agregar=page.locator('.shop-producto button.producto-agregar').first();await expect(agregar).toBeVisible();await agregar.click();await page.goto('/pagar');await verificarCampos(page,movil);
 const {token}=JSON.parse(await readFile('.privado/contenido-pruebas/sesion.json','utf8'));
 await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'}]);
 for(const ruta of ['/panel','/panel/pedidos','/panel/catalogo','/panel/proveedores','/panel/contenido','/panel/usuarios','/panel/estadisticas','/panel/soporte','/panel/soporte/reportes']){
  await page.goto(ruta);await expect(page.locator('.panel-esqueleto')).toHaveCount(0);await expect(page.locator('main:visible').first()).toBeVisible();await verificarCampos(page,movil);
 }
});
