import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`filtrar familias de Eurocomp ${idioma}`,async({page,isMobile})=>{
 await page.context().addCookies([{name:'NEXT_LOCALE',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/tienda');
 if(idioma==='en')await page.getByRole('button',{name:'Read this page in English'}).click();
 if(isMobile)await page.getByRole('button',{name:idioma==='es'?'Filtros':'Filters',exact:true}).click();
 const scope=isMobile?page.getByRole('dialog'):page.locator('.shop-sidebar');
 await scope.getByRole('button',{name:idioma==='es'?'Redes y conectividad':'Networking',exact:true}).click();
 await scope.getByRole('button',{name:'Routers',exact:true}).click();
 if(isMobile)await page.keyboard.press('Escape');
 await expect(page.locator('.shop-producto').first()).toBeVisible();
 const r=await page.request.get(`/api/catalogo?subcategoria=Routers&idioma=${idioma}`);const d=await r.json();
 expect(d.total).toBeGreaterThan(0);expect(d.productos.every((p:{subcategoria:{es:string}})=>p.subcategoria.es==='Routers')).toBe(true);
 await expect(page.locator('.shop-resultados')).not.toHaveAttribute('aria-busy','true');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
