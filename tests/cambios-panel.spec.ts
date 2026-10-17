import {test,expect} from '@playwright/test';
import es from '../messages/es.json';import en from '../messages/en.json';
for(const idioma of ['es','en'] as const)test('modal conserva cambios y permite descartarlos '+idioma,async({page,context})=>{
 const t=(idioma==='es'?es:en),sub='00000000-0000-4000-8000-000000000001';const jwt=[{alg:'HS256',typ:'JWT'},{sub,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')+'.fixture';
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'},{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:sub}})).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
 await page.goto('/panel/usuarios');await page.locator('.usuario-administrar:visible').click();const gestion=page.locator('.gestion-modal');
 await gestion.getByLabel(t.UsuariosPanel.nombre,{exact:true}).fill('Pendiente QA');await gestion.getByRole('button',{name:t.UsuariosPanel.cerrar,exact:true}).click();
 const modal=page.getByRole('dialog',{name:t.CambiosPanel.titulo,exact:true});await expect(modal).toBeVisible();await modal.getByRole('button',{name:t.CambiosPanel.seguir}).click();await expect(gestion.getByLabel(t.UsuariosPanel.nombre,{exact:true})).toHaveValue('Pendiente QA');
 await gestion.getByRole('button',{name:t.UsuariosPanel.cerrar,exact:true}).click();await modal.getByRole('button',{name:t.CambiosPanel.salir}).click();await expect(gestion).toBeHidden();
 await page.locator('.pedidos-reales-nav a[href="/panel/contenido"]').click();await page.locator('details.admin-item summary').first().click();const campo=page.locator('textarea:visible').first();await expect(campo).toBeVisible();await campo.fill('Cambio pendiente QA');
 await page.locator('.pedidos-reales-nav a[href="/panel/usuarios"]').click();await expect(modal).toBeVisible();await modal.getByRole('button',{name:t.CambiosPanel.seguir}).click();await expect(campo).toHaveValue('Cambio pendiente QA');
 await page.evaluate(()=>history.back());await expect(modal).toBeVisible();await modal.getByRole('button',{name:t.CambiosPanel.seguir}).click();await expect(campo).toHaveValue('Cambio pendiente QA');
 await page.locator('.pedidos-reales-nav a[href="/panel/usuarios"]').click();await page.screenshot({path:'.privado/evidencias/modal-cambios-'+idioma+'-'+page.viewportSize()?.width+'.png'});await modal.getByRole('button',{name:t.CambiosPanel.salir}).click();await expect(page).toHaveURL(/\/panel\/usuarios$/);
});
