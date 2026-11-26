import {test,expect,type Page} from '@playwright/test';
import {VERSION_PREFERENCIAS_MEDICION} from '../src/lib/preferencias-medicion';
import es from '../messages/es.json';import en from '../messages/en.json';
// Notice with one "Continuar" button and an X (owner decision 2026-11-25, docs/campanas-y-conversiones.md).
// Accepting: Continuar, the X, or moving to another page after the notice was shown. First view and reloads never accept.
const guardada=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('sg-medicion')??'null'));
async function espiar(page:Page){
 const estadisticas:Record<string,string>[]=[],contextos:Record<string,unknown>[]=[];
 await page.route('**/api/estadisticas',async r=>{estadisticas.push(r.request().postDataJSON());await r.fulfill({status:204});});
 page.on('request',r=>{if(r.url().includes('/api/publicidad/contexto'))contextos.push(r.postDataJSON());});
 return {estadisticas,contextos};
}
async function idioma(page:Page,context:import('@playwright/test').BrowserContext,lang:'es'|'en'){await context.addCookies([{name:'sg-idioma',value:lang,domain:'127.0.0.1',path:'/'}]);return (lang==='es'?es:en).Analitica;}
// A client-side navigation to another page of the site (footer link; the click is dispatched because the notice can sit over the footer), not a reload or a new document.
const irAOtraPagina=async(page:Page)=>{const enlace=page.locator('footer a[href="/terminos"]');await enlace.dispatchEvent('click');await expect(page).toHaveURL(/\/terminos/);};

for(const lang of ['es','en'] as const)test(`la primera vista y las recargas no aceptan; Continuar guarda cómo se aceptó ${lang}`,async({page,context})=>{
 const t=await idioma(page,context,lang);const {estadisticas,contextos}=await espiar(page);
 await page.goto('/');const aviso=page.locator('.medicion-aviso');await expect(aviso).toBeVisible();
 await expect(aviso.getByRole('heading',{name:t.titulo})).toBeVisible();
 // The notice offers one button and an X: no refusal or settings button.
 await expect(aviso.getByRole('button',{name:t.continuar,exact:true})).toBeVisible();await expect(aviso.getByRole('button',{name:t.cerrarAviso,exact:true})).toBeVisible();
 await expect(aviso.getByRole('button')).toHaveCount(2);
 await page.waitForLoadState('networkidle');
 await page.reload();await expect(aviso).toBeVisible();await page.reload();await expect(aviso).toBeVisible();await page.waitForLoadState('networkidle');
 expect(await guardada(page)).toBeNull();expect(estadisticas).toEqual([]);expect(contextos.filter(c=>c.permitir===true)).toEqual([]);expect(await page.evaluate(()=>Boolean(window.fbq))).toBe(false);
 await aviso.getByRole('button',{name:t.continuar,exact:true}).click();await expect(aviso).toHaveCount(0);
 expect(await guardada(page)).toMatchObject({analitica:true,publicidad:true,origen:'click',version:VERSION_PREFERENCIAS_MEDICION});
 await expect.poll(()=>estadisticas.filter(e=>e.tipo==='pagina').length).toBeGreaterThan(0);await expect.poll(()=>contextos.filter(c=>c.permitir===true).length).toBeGreaterThan(0);
});

for(const lang of ['es','en'] as const)test(`pasar a otra página acepta, sin perder la campaña de la primera visita ${lang}`,async({page,context})=>{
 await idioma(page,context,lang);const {estadisticas,contextos}=await espiar(page);
 const fbclid='IwAR0aviso_cookies_prueba';
 await page.goto(`/?utm_source=instagram&utm_medium=paid&utm_campaign=sg_lenovo_82xm_20261105&fbclid=${fbclid}`);const aviso=page.locator('.medicion-aviso');await expect(aviso).toBeVisible();
 await page.waitForLoadState('networkidle');expect(estadisticas).toEqual([]);expect(contextos.filter(c=>c.permitir===true)).toEqual([]);expect(await guardada(page)).toBeNull();
 await irAOtraPagina(page);
 await expect(aviso).toHaveCount(0);
 expect(await guardada(page)).toMatchObject({analitica:true,publicidad:true,origen:'implicit'});
 // The landing URL is kept in memory only: its campaign and Meta click reach the server once the visitor accepts by browsing.
 await expect.poll(()=>contextos.some(c=>c.permitir===true&&JSON.stringify(c).includes('sg_lenovo_82xm_20261105')&&JSON.stringify(c).includes(fbclid))).toBe(true);
 await expect.poll(()=>estadisticas.filter(e=>e.tipo==='pagina').length).toBeGreaterThan(0);
 expect(await page.evaluate(()=>[sessionStorage.getItem('sg-aviso-mostrado'),JSON.stringify(localStorage)].join('|').includes('IwAR0aviso'))).toBe(false);
});

test('la X acepta y el enlace de la política también (el aviso se cierra y queda aceptado)',async({page,context})=>{
 const t=await idioma(page,context,'es');await espiar(page);
 await page.goto('/');const aviso=page.locator('.medicion-aviso');await expect(aviso).toBeVisible();
 await aviso.getByRole('button',{name:t.cerrarAviso,exact:true}).click();await expect(aviso).toHaveCount(0);
 expect(await guardada(page)).toMatchObject({analitica:true,publicidad:true,origen:'close'});
 await page.evaluate(()=>{localStorage.removeItem('sg-medicion');sessionStorage.clear();});await page.goto('/nosotros');await expect(aviso).toBeVisible();
 await aviso.getByRole('link',{name:t.politicaCookies}).click();await expect(page).toHaveURL(/\/privacidad/);await expect(aviso).toHaveCount(0);
 expect(await guardada(page)).toMatchObject({analitica:true,publicidad:true,origen:'implicit'});
});

test('una negativa guardada se respeta al cerrar el aviso y al navegar',async({page,context})=>{
 const t=await idioma(page,context,'es');const {estadisticas,contextos}=await espiar(page);
 await page.addInitScript(()=>{if(!sessionStorage.getItem('qa-iniciado')){sessionStorage.setItem('qa-iniciado','1');localStorage.setItem('sg-medicion',JSON.stringify({analitica:false,publicidad:false,version:'2026-11-03-v1',fecha:'2026-11-03T00:00:00.000Z'}));}});
 await page.goto('/');await expect(page.locator('.medicion-aviso')).toHaveCount(0);
 await irAOtraPagina(page);await page.reload();
 expect(await guardada(page)).toMatchObject({analitica:false,publicidad:false});
 await page.waitForLoadState('networkidle');expect(estadisticas).toEqual([]);expect(contextos.filter(c=>c.permitir===true)).toEqual([]);
 // A refusal stored with an older notice version and a mixed choice must not look undecided either.
 await page.evaluate(()=>{localStorage.setItem('sg-medicion',JSON.stringify({analitica:true,publicidad:false,version:'2026-01-01-antigua',fecha:''}));sessionStorage.removeItem('sg-aviso-mostrado');});
 await page.goto('/nosotros');const aviso=page.locator('.medicion-aviso');await expect(aviso).toBeVisible();
 await aviso.getByRole('button',{name:t.cerrarAviso,exact:true}).click();await expect(aviso).toHaveCount(0);
 expect(await guardada(page)).toMatchObject({analitica:true,publicidad:false,origen:'close'});
 await page.waitForLoadState('networkidle');expect(contextos.filter(c=>c.permitir===true)).toEqual([]);
});

for(const lang of ['es','en'] as const)test(`el enlace del pie retira el permiso y apaga la medición al instante ${lang}`,async({page,context})=>{
 const t=await idioma(page,context,lang);const {estadisticas,contextos}=await espiar(page);
 await page.goto('/');const aviso=page.locator('.medicion-aviso');await aviso.getByRole('button',{name:t.continuar,exact:true}).click();await expect(aviso).toHaveCount(0);
 await expect.poll(()=>estadisticas.length).toBeGreaterThan(0);
 const enlace=page.locator('footer .pie-preferencias');await enlace.scrollIntoViewIfNeeded();await expect(enlace).toHaveText(t.preferencias);await enlace.click();
 await expect(aviso).toBeVisible();await expect(aviso.getByRole('heading',{name:t.tituloAjustes})).toBeVisible();
 await expect(aviso.getByRole('checkbox',{name:new RegExp(t.analitica)})).toBeChecked();await expect(aviso.getByRole('checkbox',{name:new RegExp(t.publicidad)})).toBeChecked();
 await aviso.getByRole('checkbox',{name:new RegExp(t.analitica)}).uncheck();await aviso.getByRole('checkbox',{name:new RegExp(t.publicidad)}).uncheck();
 await aviso.getByRole('button',{name:t.guardar,exact:true}).click();await expect(aviso).toHaveCount(0);
 expect(await guardada(page)).toMatchObject({analitica:false,publicidad:false});
 await expect.poll(()=>contextos.some(c=>c.permitir===false)).toBe(true);
 const antes=estadisticas.length;await irAOtraPagina(page);await page.reload();await page.waitForLoadState('networkidle');
 expect(estadisticas.length).toBe(antes);expect(await guardada(page)).toMatchObject({analitica:false,publicidad:false});await expect(aviso).toHaveCount(0);
 // The same link is on the privacy page.
 await page.goto('/privacidad');await expect(page.locator('article .pie-preferencias')).toBeVisible();
});

test('en la app nativa la X y navegar no aceptan; solo Continuar',async({page,context})=>{
 const t=await idioma(page,context,'es');const {estadisticas}=await espiar(page);
 await page.addInitScript(()=>{(window as unknown as {Capacitor:unknown}).Capacitor={isNativePlatform:()=>true};});
 await page.goto('/');const aviso=page.locator('.medicion-aviso');await expect(aviso).toBeVisible();
 await irAOtraPagina(page);await expect(aviso).toBeVisible();expect(await guardada(page)).toBeNull();
 await aviso.getByRole('button',{name:t.cerrarAviso,exact:true}).click();await expect(aviso).toHaveCount(0);expect(await guardada(page)).toBeNull();expect(estadisticas).toEqual([]);
 await page.reload();await expect(aviso).toBeVisible();await aviso.getByRole('button',{name:t.continuar,exact:true}).click();
 expect(await guardada(page)).toMatchObject({analitica:true,publicidad:true,origen:'click'});
});

test('el aviso no se acepta en pantallas de administración',async({page,context})=>{
 await idioma(page,context,'es');await espiar(page);
 await page.goto('/');await expect(page.locator('.medicion-aviso')).toBeVisible();
 await page.goto('/admin');await page.goto('/panel');
 expect(await guardada(page)).toBeNull();
});

test('en celular el aviso es compacto y deja ver el precio y los botones de la ficha',async({page,context},info)=>{
 test.skip(info.project.name!=='safari-movil','solo en el proyecto móvil');
 await idioma(page,context,'es');await espiar(page);
 await page.setViewportSize({width:390,height:844});
 await page.goto('/tienda');await expect(page.locator('.medicion-aviso')).toBeVisible();await page.waitForLoadState('networkidle');const ficha=await page.locator('a[href^="/tienda/"]').first().getAttribute('href');expect(ficha).toBeTruthy();
 await page.evaluate(()=>sessionStorage.clear());await page.goto(`${ficha}?utm_source=instagram&utm_campaign=sg_lenovo_82xm_20261105`);await expect(page.locator('h1')).toBeVisible();
 const aviso=page.locator('.medicion-aviso');await expect(aviso).toBeVisible();
 const alto=(await aviso.boundingBox())!.height;expect(alto).toBeLessThan(844*0.4);
 // The page keeps room below the notice, so nothing is permanently hidden by it.
 await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.body).paddingBottom)).not.toBe('0px');
 await page.screenshot({path:'output/aviso-cookies/movil-ficha-lenovo.png'});
});

for(const lang of ['es','en'] as const)test(`capturas del aviso y del panel ${lang}`,async({page,context},info)=>{
 const t=await idioma(page,context,lang);await espiar(page);
 if(info.project.name==='safari-movil')await page.setViewportSize({width:390,height:844});
 await page.goto('/tienda');const aviso=page.locator('.medicion-aviso');await expect(aviso).toBeVisible();await page.waitForLoadState('networkidle');
 const base=`output/aviso-cookies/${info.project.name}-${lang}`;
 await page.screenshot({path:`${base}-aviso.png`});
 await aviso.getByRole('button',{name:t.continuar,exact:true}).click();await expect(aviso).toHaveCount(0);
 const enlace=page.locator('footer .pie-preferencias');await enlace.scrollIntoViewIfNeeded();await enlace.click();await expect(aviso).toBeVisible();
 await page.screenshot({path:`${base}-panel.png`});
});
