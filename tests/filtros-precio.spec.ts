import {test,expect} from '@playwright/test';
for(const lang of ['es','en'])test(`precio marcas y panel ${lang}`,async({page,isMobile})=>{
 await page.goto('/tienda');if(lang==='en')await page.getByRole('button',{name:'Read this page in English'}).click();
 if(isMobile)await page.getByRole('button',{name:lang==='es'?'Filtros':'Filters',exact:true}).click();
 const scope=isMobile?page.getByRole('dialog'):page.locator('.shop-sidebar');
 await scope.getByLabel(lang==='es'?'Precio máximo (₡)':'Maximum price (₡)',{exact:true}).fill('20000');
 await scope.getByRole('checkbox').first().check();
 await expect(scope.getByRole('checkbox').first()).toBeChecked();
 if(isMobile){await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();}
 const baratos=await (await page.request.get('/api/catalogo?max=20000')).json();const marcas=[...new Set(baratos.productos.map((p:{marca:string})=>p.marca))].slice(0,2) as string[];expect(marcas.length).toBeGreaterThan(0);const parametros=new URLSearchParams({max:'20000'});for(const m of marcas)parametros.append('marcas',m);const r=await page.request.get('/api/catalogo?'+parametros);const d=await r.json();expect(d.total).toBeGreaterThan(0);expect(d.productos.every((p:{precio:number;marca:string})=>p.precio<=20000&&marcas.includes(p.marca))).toBe(true);
 await page.locator('.shop-filtros-activos').getByRole('button',{name:lang==='es'?'Limpiar filtros':'Clear filters',exact:true}).click();
 await expect(page.locator('.shop-filtros-activos button')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
