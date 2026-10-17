import {test,expect} from '@playwright/test';
import logos from '../src/lib/marcas-logos.json';
for(const idioma of ['es','en'])test(`marcas, categorías y carrusel coinciden con todos los productos ${idioma}`,async({page,request,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 const primera=await(await request.get('/api/catalogo')).json();
 const productos=[...primera.productos];
 for(let desde=2;desde<=primera.paginas;desde+=8){const paginas=await Promise.all(Array.from({length:Math.min(8,primera.paginas-desde+1)},(_,i)=>request.get(`/api/catalogo?pagina=${desde+i}`).then(r=>r.json())));for(const p of paginas)productos.push(...p.productos);}
 expect(productos.length).toBe(primera.total);expect(new Set(productos.map(p=>p.id)).size).toBe(primera.total);
 const marcas=new Map<string,number>(),categorias=new Map<string,number>();
 for(const p of productos){if(p.marca)marcas.set(p.marca,(marcas.get(p.marca)??0)+1);for(const x of p.clasificaciones??[{categoria:p.categoria}])categorias.set(x.categoria,(categorias.get(x.categoria)??0)+1);}
 await page.goto('/tienda');await expect(page.locator('.shop-orden-trigger')).toBeEnabled();
 expect((await page.locator('.shop-sidebar .shop-nombre-marca').allTextContents()).sort()).toEqual([...marcas.keys()].sort());
 for(const etiqueta of await page.locator('.shop-sidebar .shop-marcas-opciones label').all()){const nombre=await etiqueta.locator('.shop-nombre-marca').innerText();expect(await etiqueta.locator('small').innerText()).toBe(`(${marcas.get(nombre)})`);}
 const totalCategorias=await page.locator('.shop-sidebar .shop-categoria-rama>button>.shop-categoria-indicador>span').evaluateAll(es=>es.reduce((n,e)=>n+Number(e.textContent),0));expect(totalCategorias).toBe([...categorias.values()].reduce((a,b)=>a+b,0));
 const visibles=await page.locator('.marcas-grupo').first().locator('.marca-pie>span').allTextContents();
 const normalizar=(n:string)=>n.toUpperCase().replace(/[^A-Z0-9]/g,'');
 expect(visibles.length).toBe(new Set(visibles.map(normalizar)).size);
 const conLogo=new Set([...Object.keys(logos).map(normalizar),'CUSTOMAMERICA']);
 const esperadas=[...marcas.keys()].filter(n=>conLogo.has(normalizar(n)));
 expect([...new Set(visibles)].sort()).toEqual(esperadas.sort());
});
