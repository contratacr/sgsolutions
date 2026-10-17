import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`la subcategoría reemplaza la etiqueta de categoría y al quitarla la restaura ${idioma}`,async({page,context,baseURL},info)=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda');
 await page.locator('.shop-empresa-entrada button').click();
 const movil=/movil|mobile/.test(info.project.name),panel=page.locator(movil?'.shop-panel-filtros':'.shop-sidebar');
 const categoria=idioma==='es'?'Soluciones Empresariales':'Business Solutions';
 const subcategoria=idioma==='es'?'Almacenamiento y respaldo':'Storage and backup';
 await panel.locator('.shop-subcategorias').getByRole('button',{name:new RegExp(subcategoria)}).click();
 if(movil)await panel.locator('.shop-panel-filtros-acciones>.boton').first().click();
 const etiquetas=page.locator('.shop-filtros-activos');
 await expect(etiquetas.getByRole('button',{name:categoria,exact:true})).toHaveCount(0);
 await expect(etiquetas.getByRole('button',{name:subcategoria,exact:true})).toBeVisible();
 const colocacion=await page.locator('.shop-conteo-ayuda').evaluate(e=>{const c=e.querySelector('.conteo')!.getBoundingClientRect(),f=e.querySelector('.shop-filtros-activos')!.getBoundingClientRect();return {derecha:f.left>=c.right,centrado:Math.abs(c.top+c.height/2-f.top-f.height/2)<1};});
 expect(colocacion).toEqual({derecha:true,centrado:true});

 await page.reload();await expect(etiquetas.getByRole('button',{name:subcategoria,exact:true})).toBeVisible();
 await etiquetas.getByRole('button',{name:subcategoria,exact:true}).click();
 await expect(etiquetas.getByRole('button',{name:categoria,exact:true})).toBeVisible();
 await expect(etiquetas.getByRole('button',{name:subcategoria,exact:true})).toHaveCount(0);
 await etiquetas.getByRole('button',{name:categoria,exact:true}).click();await expect(etiquetas.locator('button')).toHaveCount(0);
});
