import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const plantillas=JSON.parse(readFileSync('supabase/templates/manifest.json','utf8')) as {id:string;titulo:[string,string];boton?:[string,string]}[];

// Vista previa con datos ficticios; Supabase evalúa las expresiones Go en el envío real.
function renderizar(html:string,en:boolean,redirect:string){
 return html.replace(/{{ if eq \.Data\.idioma "en" }}([\s\S]*?){{ else }}([\s\S]*?){{ end }}/g,(_,ingles,espanol)=>en?ingles:espanol)
 .replace(/{{ if \.RedirectTo }}([\s\S]*?){{ else }}([\s\S]*?){{ end }}/g,(_,si,no)=>redirect?si:no)
 .replaceAll('{{ .RedirectTo }}',redirect).replaceAll('{{ .SiteURL }}','https://sgsolutionscr.com')
 .replaceAll('{{ .TokenHash }}','HASH_FICTICIO').replaceAll('{{ .ConfirmationURL }}','https://example.com/confirmacion-ficticia')
 .replaceAll('{{ .Token }}','123456');
}
for(const idioma of ['es','en'] as const){
 test(`plantillas de Auth y seguridad en ${idioma}`,async({page})=>{
  await page.route('https://sgsolutionscr.com/imagenes/logo-principal.png',route=>route.fulfill({path:'public/imagenes/logo-principal.png',contentType:'image/png'}));
  for(const plantilla of plantillas){
   const html=readFileSync(`supabase/templates/${plantilla.id}.html`,'utf8');
   const redirect=plantilla.id==='recovery'?'http://127.0.0.1:3107/cuenta/confirmar?flujo=recuperar':'http://127.0.0.1:3107/cuenta/confirmar';
   for(const destino of [redirect,'']){
    const resultado=renderizar(html,idioma==='en',destino);
    expect(resultado).not.toContain('{{');
    expect(resultado).not.toMatch(/contratacr|<script/i);
    await page.setContent(resultado);
    await expect(page.locator('html')).toHaveAttribute('lang',idioma);
    await expect(page.getByRole('heading',{level:1})).toHaveText(plantilla.titulo[idioma==='en'?1:0]);
    await expect(page.getByRole('img',{name:'SG Solutions'})).toBeVisible();
    await expect.poll(()=>page.locator('img').evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await expect(page.getByRole('link',{name:'2446-7846',exact:true})).toHaveAttribute('href','tel:+50624467846');await expect(page.locator('a[href^="https://wa.me/50686065342"]')).toHaveAttribute('rel','noopener noreferrer');
    if(plantilla.boton){
     const href=await page.getByRole('link',{name:plantilla.boton[idioma==='en'?1:0],exact:true}).getAttribute('href');
     const url=new URL(href!);
     if(plantilla.id==='confirmation'){await expect(page.getByText('123456',{exact:true})).toBeVisible();expect(html).not.toContain('.TokenHash');await page.emulateMedia({colorScheme:'dark'});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:`.privado/evidencias/correo-codigo-oscuro-${idioma}-${test.info().project.name}.png`,fullPage:true});await page.emulateMedia({colorScheme:'light'});}
   if(['confirmation','recovery'].includes(plantilla.id)){
      expect(url.pathname).toBe('/cuenta/confirmar');
      expect(url.searchParams.get('token_hash')).toBe('HASH_FICTICIO');
      expect(url.searchParams.get('type')).toBe(plantilla.id==='confirmation'?'signup':'recovery');
      if(destino&&plantilla.id==='recovery')expect(url.searchParams.get('flujo')).toBe('recuperar');
     }
    }
   }
   if(plantilla.id==='confirmation'){await expect(page.getByText('123456',{exact:true})).toBeVisible();expect(html).not.toContain('.TokenHash');await page.emulateMedia({colorScheme:'dark'});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:`.privado/evidencias/correo-codigo-oscuro-${idioma}-${test.info().project.name}.png`,fullPage:true});await page.emulateMedia({colorScheme:'light'});}
   if(['confirmation','recovery'].includes(plantilla.id))await page.screenshot({path:`.privado/evidencias/correo-${plantilla.id}-${idioma}-${test.info().project.name}.png`,fullPage:true});
  }
 });
}
